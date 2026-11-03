import * as cheerio from "cheerio";
import type { Binding, Course, CourseGroup, SemesterType, Turnus } from "../types";

export const EKVV_BASE = "https://ekvv.uni-bielefeld.de/sinfo/publ/";
export const KVV_BASE = "https://ekvv.uni-bielefeld.de/kvv_publ/publ/";

const clean = (s: string) =>
  s
    .replace(/\u00ad/g, "")
    .replace(/\s+/g, " ")
    .trim();

function main(html: string) {
  const $ = cheerio.load(html);
  const root = $("#maincontent").length ? $("#maincontent") : $("body");
  return { $, root };
}

export interface ProgramOverview {
  name: string;
  variant: string;
  degree: string;
  semesters: number;
  lp: number;
  startTerms: SemesterType[];
  fsbPath: string | null;
  expiring: boolean;
}

function labelled(root: cheerio.Cheerio<never>, $: cheerio.CheerioAPI, label: string): string {
  const strong = root
    .find("strong")
    .filter((_, el) => clean($(el).text()) === label)
    .first();
  if (!strong.length) return "";
  return clean(strong.parent().text().replace(label, ""));
}

export function parseProgramOverview(html: string): ProgramOverview {
  const { $, root } = main(html);
  const r = root as unknown as cheerio.Cheerio<never>;
  const name = clean(root.find("h1 .fachname").first().text());
  const variant = clean(root.find("h1 .variante").first().text());
  const degree = labelled(r, $, "Abschluss:");
  const semesters = parseInt(labelled(r, $, "Studiendauer:"), 10) || 0;
  const lpMatch = clean(root.text()).match(/umfasst (?:insgesamt )?(\d+) Leistungspunkte/);
  const begin = labelled(r, $, "Studienbeginn:");
  const startTerms: SemesterType[] = [];
  if (/Winter/.test(begin)) startTerms.push("WiSe");
  if (/Sommer/.test(begin)) startTerms.push("SoSe");
  const fsb = root.find("a.icon-pdf, a.pdf_fsb_link").first().attr("href") ?? null;
  return {
    name,
    variant,
    degree,
    semesters,
    lp: lpMatch ? parseInt(lpMatch[1], 10) : 0,
    startTerms: startTerms.length ? startTerms : ["WiSe"],
    fsbPath: fsb ? fsb.split(";")[0] : null,
    expiring: root.find(".hinweis_alte_fsb").length > 0,
  };
}

export interface ModuleRow {
  code: string;
  ekvvId: string;
  name: string;
  lp: number;
  recommendedSemesters: number[];
  binding: Binding;
  group: string;
}

export function parseSemesters(text: string): number[] {
  return [...clean(text).matchAll(/(\d+)\./g)].map((m) => parseInt(m[1], 10));
}

export function parseModuleList(html: string): ModuleRow[] {
  const { $, root } = main(html);
  const rows: ModuleRow[] = [];
  root.find("table.modulliste").each((_, table) => {
    const heading = $(table).prevAll("h2, h3").first();
    const group = heading.is("h3") ? clean(heading.text()) : "";
    $(table)
      .find("tr.clickable-row")
      .each((_, tr) => {
        const $tr = $(tr);
        const href = $tr.attr("data-href") ?? $tr.find("a").attr("href") ?? "";
        const id = href.match(/modul\/(\d+)/)?.[1] ?? "";
        rows.push({
          code: clean($tr.find("td.kuerzel").text()),
          ekvvId: id,
          name: clean($tr.find("td.name").text()),
          lp: parseFloat(clean($tr.find("td.punkte").text()).replace(",", ".")) || 0,
          recommendedSemesters: parseSemesters($tr.find("td.semester").text()),
          binding: /wahl/i.test(clean($tr.find("td.pflicht").text())) ? "Wahlpflicht" : "Pflicht",
          group,
        });
      });
  });
  return rows;
}

export interface ModuleDetail {
  code: string;
  name: string;
  turnusText: string;
  faculty: string;
  responsible: string;
  prerequisites: string | null;
  recommendedKnowledge: string | null;
}

export function parseTurnus(text: string): Turnus {
  const t = text.toLowerCase();
  if (/jedes semester|every semester|wise\s*&\s*sose/.test(t)) return "both";
  if (/winter/.test(t)) return "WiSe";
  if (/sommer|summer/.test(t)) return "SoSe";
  return "irregular";
}

export function parseModule(html: string): ModuleDetail {
  const { root } = main(html);
  const field = (cls: string) => clean(root.find(`h2.${cls}`).first().next().text());
  const optional = (cls: string) => {
    const v = field(cls);
    return v && v !== "—" && v !== "-" ? v : null;
  };
  const [code = "", ...rest] = clean(root.find("h1").first().text())
    .replace(/^(Modul|Module)\s+/, "")
    .split(" ");
  const name = rest.join(" ");
  return {
    code,
    name,
    turnusText: field("modul_turnus"),
    faculty: field("modul_fakultaet"),
    responsible: field("modul_modulbeauftragter"),
    prerequisites: optional("modul_vorraussetzungen"),
    recommendedKnowledge: optional("modul_vorkenntnisse"),
  };
}

/** "WiSe 2024/2025" -> "WiSe 2024", "SoSe 2025" -> "SoSe 2025". */
export function termKey(label: string): string | null {
  const m = clean(label).match(/^(WiSe|SoSe) (\d{4})/);
  return m ? `${m[1]} ${m[2]}` : null;
}

export interface SemesterOption {
  key: string;
  semId: string;
}

/** Semesters on eKVV's `Semester_Auswahl.jsp`, newest first. */
export function parseSemesterList(html: string): SemesterOption[] {
  const $ = cheerio.load(html);
  const out: SemesterOption[] = [];
  $('a[href*="semester_AuswahlAct"]').each((_, el) => {
    const key = termKey($(el).text());
    const semId = $(el)
      .attr("href")
      ?.match(/sem_id=(\d+)/)?.[1];
    if (key && semId && !out.some((s) => s.key === key)) out.push({ key, semId });
  });
  return out;
}

export interface ModuleCourses {
  /** Semester the page shows (eKVV keeps it in the session). */
  term: string | null;
  groups: CourseGroup[];
}

/** Courses on `kvv_publ/publ/ModulDetail.jsp?id=<module>` for the selected semester; exams are skipped. */
export function parseModuleCourses(html: string): ModuleCourses {
  const { $, root } = main(html);
  const term = termKey(root.find('a[href*="semester_AuswahlAct"] u').first().text());
  const groups: CourseGroup[] = [];
  root.find("h2.element").each((_, h) => {
    const siblings = $(h).nextUntil("h2, h4");
    const rows = siblings.filter("table.vn").find("tbody tr").add(siblings.find("table.vn tbody tr"));
    const courses: Course[] = [];
    rows.each((_, tr) => {
      const type = clean($(tr).find("td.art").text());
      const id = $(tr)
        .find("td.thema a")
        .first()
        .attr("href")
        ?.match(/[?&]id=(\d+)/)?.[1];
      if (!type || type === "Kl" || !id || courses.some((c) => c.id === id)) return;
      const zeit = $(tr).find("td.zeit").clone();
      zeit.find("em").remove();
      zeit.find("br").replaceWith("\n");
      courses.push({
        id,
        nr: clean($(tr).find("td.belegnr").text()),
        title: clean($(tr).find("td.thema a").first().text()),
        type,
        lecturers: clean($(tr).find("td.doz").text()),
        times: zeit.text().split("\n").map(clean).filter(Boolean).join("; "),
      });
    });
    if (courses.length) groups.push({ element: clean($(h).text()), courses });
  });
  return { term, groups };
}
