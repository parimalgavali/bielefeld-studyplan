"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { findCourse, loadCourses, moduleTerms, termLabel } from "@/lib/courses";
import { tr } from "@/lib/i18n";
import {
  addCourse,
  addToSemester,
  assignAreas,
  CUSTOM_PREFIX,
  decodePlan,
  emptyPlan,
  encodePlan,
  findModule,
  missingPflicht,
  profileGroups,
  removeCourse,
  removeFromPlan,
  resolveItem,
  semesterLabel,
  semesterLp,
  semestersAfter,
  totalLp,
  warnings,
  type Plan,
  type PlannedCourse,
} from "@/lib/plan";
import { degreeShort, loadProgram, PROGRAMS } from "@/lib/programs";
import { areaChoices, RULES } from "@/lib/rules";
import type { CourseData, Lang, Program, SemesterType } from "@/lib/types";
import ModuleChip from "./ModuleChip";
import ModuleDialog from "./ModuleDialog";
import ProgressPanel from "./ProgressPanel";
import SemesterCard from "./SemesterCard";
import Sidebar from "./Sidebar";

const STORAGE_KEY = "bielefeld-studyplan:v1";
const LANG_KEY = "bielefeld-studyplan:lang";
const THEME_KEY = "bielefeld-studyplan:theme";
const DEFAULT_PROGRAM = "462589642";

function currentStartYear(): number {
  const now = new Date();
  return now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
}

function loadStored(): Record<string, Plan> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").plans ?? {};
  } catch {
    return {};
  }
}

export default function Planner() {
  const [lang, setLang] = useState<Lang>("en");
  const [programId, setProgramId] = useState<string | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [tab, setTab] = useState<"modules" | "progress">("modules");
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [courses, setCourses] = useState<CourseData | null>(null);

  useEffect(() => {
    loadCourses().then(setCourses);
  }, []);

  useEffect(() => {
    const stored = loadStored();
    const shared = new URLSearchParams(window.location.hash.slice(1)).get("plan");
    const sharedPlan = shared ? decodePlan(shared) : null;
    let active = (JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").active as string) ?? DEFAULT_PROGRAM;
    if (sharedPlan && PROGRAMS.some((p) => p.id === sharedPlan.programId)) {
      stored[sharedPlan.programId] = sharedPlan;
      active = sharedPlan.programId;
      history.replaceState(null, "", window.location.pathname);
    }
    if (!PROGRAMS.some((p) => p.id === active)) active = DEFAULT_PROGRAM;
    const savedLang = localStorage.getItem(LANG_KEY);
    setLang(
      savedLang === "de" || savedLang === "en"
        ? savedLang
        : navigator.language.startsWith("de")
          ? "de"
          : "en",
    );
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    setPlans(stored);
    setProgramId(active);
  }, []);

  useEffect(() => {
    if (!programId) return;
    let cancelled = false;
    loadProgram(programId).then((p) => !cancelled && setProgram(p));
    return () => {
      cancelled = true;
    };
  }, [programId]);

  useEffect(() => {
    if (programId) localStorage.setItem(STORAGE_KEY, JSON.stringify({ active: programId, plans }));
  }, [plans, programId]);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const plan = useMemo(() => {
    if (!program) return null;
    return plans[program.id] ?? emptyPlan(program, currentStartYear());
  }, [plans, program]);

  const update = useCallback(
    (fn: (p: Plan) => Plan) => {
      if (!program || !plan) return;
      setPlans((all) => ({ ...all, [program.id]: fn(all[program.id] ?? plan) }));
    },
    [program, plan],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  if (!program || !plan) {
    return (
      <div className="flex h-screen items-center justify-center text-neutral-500">{tr(lang, "loading")}</div>
    );
  }

  const rules = RULES[program.id] ?? null;
  const warnByKey = new Map<string, string>();
  const allWarnings = warnings(program, plan);
  const warnCount =
    allWarnings.length + (rules?.validUntil ? semestersAfter(plan, rules.validUntil).length : 0);
  const missingCount = missingPflicht(program, plan).length;
  const total = totalLp(program, plan);
  const planEmpty = plan.semesters.every((s) => s.length === 0);
  for (const w of allWarnings) {
    if (w.kind === "turnus") warnByKey.set(w.key, tr(lang, "turnusWarning", { term: w.offered }));
    if (w.kind === "course-term") warnByKey.set(w.key, tr(lang, "courseTermWarning", { term: w.offered }));
    if (w.kind === "prerequisite")
      warnByKey.set(w.key, tr(lang, "prereqWarning", { codes: w.missing.join(", ") }));
  }
  const areaOf = rules ? assignAreas(program, plan, rules) : {};
  const profiles = profileGroups(program);
  const openItem = openKey ? resolveItem(program, plan, openKey) : null;

  const onDragStart = (e: DragStartEvent) => setDragKey((e.active.data.current?.key as string) ?? null);
  const onDragEnd = (e: DragEndEvent) => {
    setDragKey(null);
    const key = e.active.data.current?.key as string | undefined;
    const course = e.active.data.current?.course as PlannedCourse | undefined;
    const over = e.over?.id;
    if (!key || !over) return;
    if (over === "sidebar") {
      if (!course) update((p) => removeFromPlan(p, key));
    } else if (typeof over === "string" && over.startsWith("semester-")) {
      const index = Number(over.slice("semester-".length));
      update((p) => (course ? addCourse(p, key, course, index) : addToSemester(p, key, index)));
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
    setTheme(next);
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#plan=${encodePlan(plan)}`;
    try {
      await navigator.clipboard.writeText(url);
      flash(tr(lang, "copied"));
    } catch {
      window.prompt(tr(lang, "share"), url);
    }
  };

  const select =
    "h-9 rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 text-sm text-neutral-100 outline-none hover:border-neutral-700 focus:border-brand-500";
  const iconBtn =
    "grid size-9 place-items-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700 hover:text-neutral-50";
  const years = Array.from({ length: 7 }, (_, i) => currentStartYear() - 4 + i);

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex min-h-screen flex-col lg:h-screen">
        <header className="border-b border-neutral-800 bg-neutral-950">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 lg:px-6">
            <div className="mr-auto flex items-center gap-3">
              <span
                aria-hidden
                className="grid size-9 place-items-center rounded-lg bg-brand-500 text-base font-bold text-white"
              >
                B
              </span>
              <div>
                <h1 className="text-base font-semibold tracking-tight text-neutral-50">
                  {tr(lang, "title")}
                </h1>
                <p className="hidden text-xs text-neutral-500 xl:block">{tr(lang, "tagline")}</p>
              </div>
            </div>
            <select
              aria-label={tr(lang, "program")}
              value={program.id}
              onChange={(e) => setProgramId(e.target.value)}
              className={`${select} min-w-0 max-w-[24rem] font-medium xl:max-w-[30rem]`}
            >
              {PROGRAMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {degreeShort(p.degree)} {p.name[lang] || p.name.de}
                  {p.variant ? ` – ${p.variant}` : ""}
                  {p.edition ? ` · ${p.edition[lang]}` : ""}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-neutral-500">{tr(lang, "start")}</span>
              <select
                aria-label={tr(lang, "start")}
                value={plan.startTerm}
                onChange={(e) => update((p) => ({ ...p, startTerm: e.target.value as SemesterType }))}
                className={select}
              >
                <option value="WiSe">WiSe</option>
                <option value="SoSe">SoSe</option>
              </select>
              <select
                aria-label={`${tr(lang, "start")} year`}
                value={plan.startYear}
                onChange={(e) => update((p) => ({ ...p, startYear: Number(e.target.value) }))}
                className={select}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            {profiles.length > 1 && (
              <select
                aria-label={tr(lang, "profile")}
                value={plan.profile ?? ""}
                onChange={(e) => update((p) => ({ ...p, profile: e.target.value || null }))}
                className={select}
              >
                <option value="">{tr(lang, "chooseProfile")}</option>
                {profiles.map((g) => (
                  <option key={g} value={g}>
                    {program.modules.find((m) => m.group.de === g)?.group[lang] || g}
                  </option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleTheme}
                className={iconBtn}
                aria-label={tr(lang, "theme")}
                title={tr(lang, "theme")}
              >
                {theme === "dark" ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  >
                    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={() => setLang(lang === "de" ? "en" : "de")}
                className={`${iconBtn} text-xs font-semibold`}
                aria-label="Sprache / language"
              >
                {lang === "de" ? "EN" : "DE"}
              </button>
              <button
                type="button"
                onClick={share}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
                </svg>
                {tr(lang, "share")}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-neutral-800/70 px-4 py-2.5 lg:px-6">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums tracking-tight text-neutral-50">{total}</span>
              <span className="text-sm text-neutral-500">/ {program.lp} LP</span>
            </div>
            <div
              className="h-2 min-w-32 flex-1 overflow-hidden rounded-full bg-neutral-800"
              role="progressbar"
              aria-label={tr(lang, "total")}
              aria-valuenow={total}
              aria-valuemax={program.lp}
            >
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${total >= program.lp ? "bg-emerald-400" : "bg-brand-500"}`}
                style={{ width: `${Math.min(100, (total / program.lp) * 100)}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => setTab("progress")}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                missingCount
                  ? "bg-neutral-900 text-neutral-300 hover:text-neutral-50"
                  : "bg-emerald-400/10 text-emerald-400"
              }`}
            >
              {missingCount ? tr(lang, "missingShort", { n: missingCount }) : tr(lang, "allPflicht")}
            </button>
            {warnCount > 0 && (
              <button
                type="button"
                onClick={() => setTab("progress")}
                className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-400 hover:text-amber-300"
              >
                {tr(lang, warnCount === 1 ? "warningOne" : "warningsShort", { n: warnCount })}
              </button>
            )}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
            {rules?.notice && (
              <p className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs text-amber-300">
                {rules.notice[lang]}
              </p>
            )}
            {planEmpty && (
              <section className="mb-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <h2 className="mb-3 text-sm font-semibold tracking-tight text-neutral-50">
                  {tr(lang, "startTitle")}
                </h2>
                <ol className="grid gap-3 text-sm text-neutral-400 sm:grid-cols-3">
                  {(["step1", "step2", "step3"] as const).map((k, n) => (
                    <li key={k} className="flex gap-2.5">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-500/15 text-[11px] font-semibold text-brand-400">
                        {n + 1}
                      </span>
                      {tr(lang, k)}
                    </li>
                  ))}
                </ol>
              </section>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {plan.semesters.map((keys, i) => (
                <SemesterCard
                  key={i}
                  index={i}
                  label={semesterLabel(plan, i)}
                  lp={semesterLp(program, plan, i)}
                  emptyText={tr(lang, "dropHere")}
                  isEmpty={keys.length === 0}
                >
                  {keys.map((key) => {
                    const item = resolveItem(program, plan, key);
                    if (!item) return null;
                    const area = areaOf[key];
                    return (
                      <ModuleChip
                        key={key}
                        item={item}
                        lang={lang}
                        dragId={`plan:${key}`}
                        warning={warnByKey.get(key)}
                        badge={area ? rules?.areas.find((a) => a.id === area)?.short?.[lang] : undefined}
                        onOpen={() => setOpenKey(key)}
                        onRemove={() => update((p) => removeFromPlan(p, key))}
                        courses={(plan.courses?.[key] ?? []).map((c) => {
                          const found = findCourse(courses, item.module?.ekvvId, c.term, c.id);
                          return {
                            id: `${c.term}:${c.id}`,
                            label: `${found ? `${found.type} · ${found.title}` : c.id} (${termLabel(c.term)})`,
                            onRemove: () => update((p) => removeCourse(p, key, c)),
                          };
                        })}
                      />
                    );
                  })}
                </SemesterCard>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => update((p) => ({ ...p, semesters: [...p.semesters, []] }))}
                className="rounded-lg border border-dashed border-neutral-700 px-3 py-1.5 font-medium text-neutral-400 hover:border-brand-500 hover:text-brand-400"
              >
                + {tr(lang, "addSemester")}
              </button>
              {plan.semesters.length > 1 && plan.semesters.at(-1)?.length === 0 && (
                <button
                  type="button"
                  onClick={() => update((p) => ({ ...p, semesters: p.semesters.slice(0, -1) }))}
                  className="rounded-md px-3 py-1.5 text-neutral-500 hover:text-neutral-300"
                >
                  {tr(lang, "removeSemester")}
                </button>
              )}
              <span className="ml-auto text-xs text-neutral-500">{tr(lang, "saved")}</span>
              <button
                type="button"
                onClick={() =>
                  window.confirm(tr(lang, "resetConfirm")) &&
                  update(() => emptyPlan(program, plan.startYear, plan.startTerm))
                }
                className="rounded-lg px-2.5 py-1.5 text-xs text-neutral-500 hover:bg-neutral-900 hover:text-red-400"
              >
                {tr(lang, "reset")}
              </button>
            </div>
            <footer className="mt-8 max-w-3xl text-xs leading-relaxed text-neutral-600">
              {tr(lang, "disclaimer", { date: program.scrapedAt })}{" "}
              <a
                href={program.ekvvUrl + "?m"}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                {tr(lang, "ekvv")}
              </a>
              {program.fsbUrl && (
                <>
                  {" · "}
                  <a
                    href={program.fsbUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    {tr(lang, "fsb")}
                  </a>
                </>
              )}
              {" · "}
              <a
                href="https://github.com/parimalgavali/bielefeld-studyplan"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                GitHub
              </a>
            </footer>
          </main>

          <aside className="flex min-h-[28rem] flex-col border-t border-neutral-800 bg-neutral-950 p-4 lg:h-full lg:w-[25rem] lg:border-l lg:border-t-0">
            <div className="mb-3 flex gap-1 rounded-lg bg-neutral-900 p-1 text-sm" role="tablist">
              {(["modules", "progress"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                  className={`flex-1 rounded-md px-3 py-1.5 font-medium ${tab === k ? "bg-neutral-950 text-neutral-50 shadow-sm shadow-black/10" : "text-neutral-400 hover:text-neutral-200"}`}
                >
                  {tr(lang, k)}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto lg:overflow-visible">
              {tab === "modules" ? (
                <Sidebar
                  program={program}
                  plan={plan}
                  lang={lang}
                  courses={courses}
                  onOpen={setOpenKey}
                  onAddCustom={(name, lp) =>
                    update((p) => ({
                      ...p,
                      custom: [...p.custom, { id: Date.now().toString(36), name, lp }],
                    }))
                  }
                />
              ) : (
                <div className="h-full overflow-y-auto pr-1">
                  <ProgressPanel
                    program={program}
                    plan={plan}
                    rules={rules}
                    lang={lang}
                    onOpen={setOpenKey}
                  />
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragKey && resolveItem(program, plan, dragKey) ? (
          <div className="w-72 rotate-1 shadow-2xl shadow-black">
            <ModuleChip
              item={resolveItem(program, plan, dragKey)!}
              lang={lang}
              dragId="overlay"
              onOpen={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>

      {openItem && (
        <ModuleDialog
          key={openItem.key}
          item={openItem}
          plan={plan}
          lang={lang}
          plannedIndex={findModule(plan, openItem.key)}
          rules={rules}
          areaOptions={rules ? areaChoices(rules, openItem.code) : []}
          courses={courses && openItem.module ? moduleTerms(courses, openItem.module.ekvvId) : null}
          firstTerm={courses?.terms[0] ?? null}
          onClose={() => setOpenKey(null)}
          onAdd={(i) => update((p) => addToSemester(p, openItem.key, i))}
          onRemove={() => update((p) => removeFromPlan(p, openItem.key))}
          onArea={(area) =>
            update((p) => {
              const areaOverrides = { ...p.areaOverrides };
              if (area) areaOverrides[openItem.key] = area;
              else delete areaOverrides[openItem.key];
              return { ...p, areaOverrides };
            })
          }
          onDeleteCustom={
            openItem.key.startsWith(CUSTOM_PREFIX)
              ? () => {
                  const key = openItem.key;
                  setOpenKey(null);
                  update((p) => ({
                    ...removeFromPlan(p, key),
                    custom: p.custom.filter((c) => CUSTOM_PREFIX + c.id !== key),
                  }));
                }
              : undefined
          }
        />
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-neutral-100 px-3 py-1.5 text-sm text-neutral-900 shadow-lg">
          {toast}
        </div>
      )}
    </DndContext>
  );
}
