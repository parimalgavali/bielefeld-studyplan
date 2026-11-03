import { areaCandidates, type ProgramRules } from "./rules";
import type { Lang, Module, Program, SemesterType, Text } from "./types";

export interface CustomModule {
  id: string;
  name: string;
  lp: number;
}

export interface Plan {
  programId: string;
  startTerm: SemesterType;
  startYear: number;
  semesters: string[][];
  custom: CustomModule[];
  areaOverrides: Record<string, string>;
  profile: string | null;
  /** Courses picked per planned module key. */
  courses?: Record<string, PlannedCourse[]>;
}

export interface PlannedCourse {
  /** Term key such as "WiSe 2024". */
  term: string;
  id: string;
}

export interface PlanItem {
  key: string;
  code: string;
  name: Text;
  lp: number;
  module: Module | null;
}

export const CUSTOM_PREFIX = "custom:";

export function emptyPlan(program: Program, startYear: number, startTerm?: SemesterType): Plan {
  return {
    programId: program.id,
    startTerm: startTerm ?? program.startTerms[0] ?? "WiSe",
    startYear,
    semesters: Array.from({ length: Math.max(program.semesters, 1) }, () => []),
    custom: [],
    areaOverrides: {},
    profile: null,
    courses: {},
  };
}

export function semesterTerm(plan: Pick<Plan, "startTerm">, index: number): SemesterType {
  const flip = index % 2 === 1;
  if (plan.startTerm === "WiSe") return flip ? "SoSe" : "WiSe";
  return flip ? "WiSe" : "SoSe";
}

export function semesterLabel(plan: Pick<Plan, "startTerm" | "startYear">, index: number): string {
  const half = plan.startYear * 2 + (plan.startTerm === "WiSe" ? 1 : 0) + index;
  const year = Math.floor(half / 2);
  const yy = (y: number) => String(y % 100).padStart(2, "0");
  return half % 2 === 1 ? `WiSe ${yy(year)}/${yy(year + 1)}` : `SoSe ${yy(year)}`;
}

function termIndex(term: SemesterType, year: number): number {
  return year * 2 + (term === "WiSe" ? 1 : 0);
}

/** Indices of non-empty semesters that fall after the given last semester. */
export function semestersAfter(plan: Plan, until: { term: SemesterType; year: number }): number[] {
  const start = termIndex(plan.startTerm, plan.startYear);
  const last = termIndex(until.term, until.year);
  return plan.semesters.flatMap((s, i) => (s.length && start + i > last ? [i] : []));
}

export function resolveItem(program: Program, plan: Plan, key: string): PlanItem | null {
  if (key.startsWith(CUSTOM_PREFIX)) {
    const c = plan.custom.find((m) => CUSTOM_PREFIX + m.id === key);
    return c ? { key, code: "", name: { de: c.name, en: c.name }, lp: c.lp, module: null } : null;
  }
  const m = program.modules.find((x) => x.code === key);
  return m ? { key, code: m.code, name: m.name, lp: m.lp, module: m } : null;
}

export function findModule(plan: Plan, key: string): number {
  return plan.semesters.findIndex((s) => s.includes(key));
}

export function addToSemester(plan: Plan, key: string, index: number): Plan {
  const semesters = plan.semesters.map((s) => s.filter((k) => k !== key));
  semesters[index] = [...semesters[index], key];
  return { ...plan, semesters };
}

export function removeFromPlan(plan: Plan, key: string): Plan {
  const courses = { ...plan.courses };
  delete courses[key];
  return { ...plan, semesters: plan.semesters.map((s) => s.filter((k) => k !== key)), courses };
}

/** Puts the course's module into the semester (moving it if planned elsewhere) and remembers the course. */
export function addCourse(plan: Plan, key: string, course: PlannedCourse, index: number): Plan {
  const next = addToSemester(plan, key, index);
  const list = plan.courses?.[key] ?? [];
  if (list.some((c) => c.id === course.id && c.term === course.term)) return next;
  return { ...next, courses: { ...plan.courses, [key]: [...list, course] } };
}

export function removeCourse(plan: Plan, key: string, course: PlannedCourse): Plan {
  const list = (plan.courses?.[key] ?? []).filter((c) => !(c.id === course.id && c.term === course.term));
  return { ...plan, courses: { ...plan.courses, [key]: list } };
}

export function semesterLp(program: Program, plan: Plan, index: number): number {
  return plan.semesters[index].reduce((sum, k) => sum + (resolveItem(program, plan, k)?.lp ?? 0), 0);
}

export function totalLp(program: Program, plan: Plan): number {
  return plan.semesters.reduce((sum, _s, i) => sum + semesterLp(program, plan, i), 0);
}

export function profileGroups(program: Program): string[] {
  return [...new Set(program.modules.map((m) => m.group.de))].filter((g) => /^Profil /.test(g));
}

/** Groups that belong to an unselected profile ("Profil X" and "Strukturierte Ergänzung des Profils X"). */
export function inactiveGroups(program: Program, profile: string | null): Set<string> {
  const profiles = profileGroups(program);
  if (profiles.length < 2 || !profile) return new Set();
  const other = profiles.filter((p) => p !== profile).map((p) => p.replace(/^Profil /, ""));
  return new Set(
    program.modules
      .map((m) => m.group.de)
      .filter((g) =>
        other.some((o) => g === `Profil ${o}` || g.startsWith(`Strukturierte Ergänzung des Profils ${o}`)),
      ),
  );
}

export interface AreaProgress {
  id: string;
  name: Text;
  required: number;
  planned: number;
  max: boolean;
  note?: Text;
}

export function assignAreas(
  program: Program,
  plan: Plan,
  rules: ProgramRules,
): Record<string, string | null> {
  const filled: Record<string, number> = {};
  const result: Record<string, string | null> = {};
  for (const key of plan.semesters.flat()) {
    const item = resolveItem(program, plan, key);
    if (!item) continue;
    const override = plan.areaOverrides[key];
    let area: string | null = override ?? null;
    if (!area && item.code) {
      const candidates = areaCandidates(rules, item.code);
      const room = (id: string) => (rules.areas.find((a) => a.id === id)?.lp ?? 0) - (filled[id] ?? 0);
      area =
        candidates.find((id) => room(id) >= item.lp) ??
        candidates.find((id) => room(id) > 0) ??
        candidates[0] ??
        null;
    }
    result[key] = area;
    if (area) filled[area] = (filled[area] ?? 0) + item.lp;
  }
  return result;
}

export function areaProgress(program: Program, plan: Plan, rules: ProgramRules): AreaProgress[] {
  const assigned = assignAreas(program, plan, rules);
  return rules.areas.map((a) => ({
    id: a.id,
    name: a.name,
    required: a.lp,
    max: !!a.max,
    note: a.note,
    planned: Object.entries(assigned)
      .filter(([, id]) => id === a.id)
      .reduce((s, [k]) => s + (resolveItem(program, plan, k)?.lp ?? 0), 0),
  }));
}

export type Warning =
  | { kind: "turnus"; key: string; semester: number; offered: SemesterType }
  | { kind: "prerequisite"; key: string; semester: number; missing: string[] }
  | { kind: "duplicate-area"; key: string }
  | { kind: "course-term"; key: string; semester: number; offered: SemesterType };

const CODE_RE = /\b\d{2}-[A-Za-z0-9_.()/-]+/g;

export function prerequisiteCodes(text: string, known: Set<string>): string[] {
  const out = new Set<string>();
  for (const raw of text.match(CODE_RE) ?? []) {
    const base = raw.replace(/[.,;]+$/, "");
    const variants = [base, base.replace(/\(.*$/, ""), base.replace(/\((_[a-z])(\/_[a-z])*\)/, "$1")];
    const hit = variants.find((v) => known.has(v));
    out.add(hit ?? base.replace(/\(.*$/, ""));
  }
  return [...out];
}

export function warnings(program: Program, plan: Plan): Warning[] {
  const out: Warning[] = [];
  const known = new Set(program.modules.map((m) => m.code));
  plan.semesters.forEach((sem, i) => {
    const term = semesterTerm(plan, i);
    for (const key of sem) {
      const other = (plan.courses?.[key] ?? []).find((c) => !c.term.startsWith(term));
      if (other)
        out.push({ kind: "course-term", key, semester: i, offered: term === "WiSe" ? "SoSe" : "WiSe" });
      const m = resolveItem(program, plan, key)?.module;
      if (!m) continue;
      if ((m.turnus === "WiSe" || m.turnus === "SoSe") && m.turnus !== term) {
        out.push({ kind: "turnus", key, semester: i, offered: m.turnus });
      }
      if (m.prerequisites) {
        const earlier = new Set(plan.semesters.slice(0, i).flat());
        const codes = prerequisiteCodes(m.prerequisites.de, known).filter((c) => known.has(c));
        const missing = codes.filter((c) => !earlier.has(c));
        // Requirements often read "A und eines der Module B, C": only flag when none are planned earlier.
        if (codes.length && missing.length === codes.length) {
          out.push({ kind: "prerequisite", key, semester: i, missing });
        }
      }
    }
  });
  return out;
}

export function missingPflicht(program: Program, plan: Plan): Module[] {
  const planned = new Set(plan.semesters.flat());
  const inactive = inactiveGroups(program, plan.profile);
  const profiles = profileGroups(program);
  return program.modules.filter(
    (m) =>
      m.binding === "Pflicht" &&
      !planned.has(m.code) &&
      !inactive.has(m.group.de) &&
      !(profiles.length >= 2 && !plan.profile && profiles.includes(m.group.de)),
  );
}

export function encodePlan(plan: Plan): string {
  const json = JSON.stringify(plan);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodePlan(encoded: string): Plan | null {
  try {
    const bin = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const plan = JSON.parse(new TextDecoder().decode(bytes)) as Plan;
    if (!plan || typeof plan.programId !== "string" || !Array.isArray(plan.semesters)) return null;
    return {
      ...plan,
      custom: plan.custom ?? [],
      areaOverrides: plan.areaOverrides ?? {},
      profile: plan.profile ?? null,
      courses: plan.courses ?? {},
    };
  } catch {
    return null;
  }
}

export const t = (text: Text, lang: Lang) => text[lang] || text.de;
