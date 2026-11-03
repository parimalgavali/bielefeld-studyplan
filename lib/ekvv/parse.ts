import * as cheerio from "cheerio";
import type { Binding, SemesterType, Turnus } from "../types";

export const EKVV_BASE = "https://ekvv.uni-bielefeld.de/sinfo/publ/";

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
