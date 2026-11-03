import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  EKVV_BASE,
  parseModule,
  parseModuleList,
  parseProgramOverview,
  parseTurnus,
} from "../lib/ekvv/parse";
import type { Module, Program, ProgramSummary } from "../lib/types";
import { PROGRAM_IDS } from "./programs";

const USER_AGENT =
  "bielefeld-studyplan/0.1 (+https://github.com/parimalgavali/bielefeld-studyplan; unofficial student project)";
const DELAY_MS = 1500;
const CACHE_DIR = ".cache/ekvv";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Polite fetch: one request at a time, backs off on 429, caches pages on disk for re-runs. */
async function get(path: string, lang: "de" | "en" = "de"): Promise<string> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${EKVV_BASE}${path}${lang === "en" ? `${sep}lang=EN` : ""}`;
  const cacheFile = `${CACHE_DIR}/${url.slice(EKVV_BASE.length).replace(/[^A-Za-z0-9]+/g, "_")}.html`;
  if (process.env.EKVV_CACHE !== "0" && existsSync(cacheFile)) return readFileSync(cacheFile, "utf-8");
  for (let attempt = 1; ; attempt++) {
    await sleep(DELAY_MS);
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(30_000),
    }).catch(
      (err: Error) =>
        ({ ok: false, status: err.name, headers: new Headers(), text: async () => "" }) as const,
    );
    if (res.ok) {
      const html = await res.text();
      mkdirSync(CACHE_DIR, { recursive: true });
      writeFileSync(cacheFile, html);
      return html;
    }
    if (attempt >= 6) throw new Error(`${res.status} for ${url}`);
    const retryAfter = Number(res.headers.get("retry-after")) || 0;
    const wait = Math.max(retryAfter * 1000, (res.status === 429 ? 60_000 : 5_000) * attempt);
    console.warn(`  ${res.status} for ${url}, retrying in ${wait / 1000}s`);
    await sleep(wait);
  }
}

const moduleCache = new Map<string, ReturnType<typeof parseModule>>();

async function moduleDetail(id: string) {
  const cached = moduleCache.get(id);
  if (cached) return cached;
  const detail = parseModule(await get(`modul/${id}`));
  moduleCache.set(id, detail);
  console.log(`  modul/${id} ${detail.code}`);
  return detail;
}

const TURNUS_EN = {
  both: "Every semester",
  WiSe: "Every winter semester",
  SoSe: "Every summer semester",
} as const;

const IRREGULAR_EN: Record<string, string> = {
  "mindestens jährlich angeboten": "At least once a year",
  "wird nicht mehr angeboten": "No longer offered",
  auslaufend: "Being phased out",
};

async function scrapeProgram(id: string): Promise<Program> {
  const overview = parseProgramOverview(await get(`variante/${id}`));
  const overviewEn = parseProgramOverview(await get(`variante/${id}`, "en"));
  const rowsDe = parseModuleList(await get(`variante/${id}?m`));
  const rowsEn = parseModuleList(await get(`variante/${id}?m`, "en"));
  const modules: Module[] = [];
  for (const [i, row] of rowsDe.entries()) {
    const en = rowsEn[i]?.ekvvId === row.ekvvId ? rowsEn[i] : rowsEn.find((r) => r.ekvvId === row.ekvvId);
    const d = await moduleDetail(row.ekvvId);
    const turnus = parseTurnus(d.turnusText);
    const text = (v: string | null) => (v ? { de: v, en: v } : null);
    modules.push({
      code: row.code,
      ekvvId: row.ekvvId,
      name: { de: row.name, en: en?.name || row.name },
      lp: row.lp,
      recommendedSemesters: row.recommendedSemesters,
      binding: row.binding,
      group: { de: row.group, en: en?.group || row.group },
      turnus,
      turnusText: {
        de: d.turnusText,
        en:
          turnus === "irregular"
            ? (IRREGULAR_EN[d.turnusText.toLowerCase()] ?? d.turnusText)
            : TURNUS_EN[turnus],
      },
      faculty: { de: d.faculty, en: d.faculty },
      responsible: d.responsible,
      prerequisites: text(d.prerequisites),
      recommendedKnowledge: text(d.recommendedKnowledge),
    });
  }
  console.log(`${id} ${overview.name} ${overview.variant}: ${modules.length} modules`);
  return {
    id,
    name: { de: overview.name, en: overviewEn.name || overview.name },
    variant: overview.variant,
    degree: overview.degree,
    semesters: overview.semesters,
    lp: overview.lp,
    startTerms: overview.startTerms,
    ekvvUrl: `${EKVV_BASE}variante/${id}`,
    fsbUrl: overview.fsbPath ? `https://ekvv.uni-bielefeld.de${overview.fsbPath}` : null,
    scrapedAt: new Date().toISOString().slice(0, 10),
    modules,
  };
}

async function main() {
  const only = process.argv.slice(2);
  const ids = only.length ? only : PROGRAM_IDS;
  mkdirSync("data/programs", { recursive: true });
  for (const id of ids) {
    const program = await scrapeProgram(id);
    writeFileSync(`data/programs/${id}.json`, JSON.stringify(program, null, 2) + "\n");
  }
  const index: ProgramSummary[] = [];
  for (const id of PROGRAM_IDS) {
    const { modules: _m, ...p } = (await import(`../data/programs/${id}.json`, { with: { type: "json" } }))
      .default as Program;
    void _m;
    index.push({
      id: p.id,
      name: p.name,
      variant: p.variant,
      degree: p.degree,
      semesters: p.semesters,
      lp: p.lp,
    });
  }
  writeFileSync("data/programs/index.json", JSON.stringify(index, null, 2) + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
