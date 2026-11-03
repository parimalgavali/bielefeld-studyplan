import { readFileSync, writeFileSync } from "node:fs";
import { KVV_BASE, parseModuleCourses, parseSemesterList } from "../lib/ekvv/parse";
import { LISTED_PROGRAM_IDS } from "../lib/listed";
import type { CourseData, Program } from "../lib/types";
import { dropCache, fetchHtml, isCached } from "./http";

/** First semester whose courses are collected. */
const FROM = "SoSe 2024";

const order = (key: string) => {
  const [term, year] = key.split(" ");
  return Number(year) * 2 + (term === "WiSe" ? 1 : 0);
};

/** eKVV keeps the chosen semester in the session, so each semester gets its own session cookie. */
async function session(semId: string): Promise<string> {
  const home = await fetchHtml(`${KVV_BASE}Home.jsp`);
  const cookie = home.setCookie.map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error("eKVV sent no session cookie");
  await fetchHtml(`${KVV_BASE}semester_AuswahlAct?sem_id=${semId}&bu=.%2fHome.jsp`, { cookie });
  return cookie;
}

async function main() {
  const moduleIds = [
    ...new Set(
      LISTED_PROGRAM_IDS.flatMap((id) =>
        (JSON.parse(readFileSync(`data/programs/${id}.json`, "utf-8")) as Program).modules.map(
          (m) => m.ekvvId,
        ),
      ),
    ),
  ];
  const semesters = parseSemesterList((await fetchHtml(`${KVV_BASE}Semester_Auswahl.jsp`)).html)
    .filter((s) => order(s.key) >= order(FROM))
    .sort((a, b) => order(a.key) - order(b.key));
  const data: CourseData = {
    scrapedAt: new Date().toISOString().slice(0, 10),
    terms: semesters.map((s) => s.key),
    modules: {},
  };
  for (const sem of semesters) {
    let cookie: string | null = null;
    let found = 0;
    for (const id of moduleIds) {
      const cacheKey = `courses_${sem.semId}_${id}`;
      for (let attempt = 1; ; attempt++) {
        if (!cookie && !isCached(cacheKey)) cookie = await session(sem.semId);
        const { html } = await fetchHtml(`${KVV_BASE}ModulDetail.jsp?id=${id}`, {
          cacheKey,
          cookie: cookie ?? undefined,
        });
        const page = parseModuleCourses(html);
        if (page.term !== sem.key) {
          // Expired session: eKVV falls back to the current semester.
          dropCache(cacheKey);
          cookie = null;
          if (attempt >= 3) throw new Error(`module ${id}: expected ${sem.key}, got ${page.term}`);
          continue;
        }
        if (page.groups.length) {
          (data.modules[id] ??= {})[sem.key] = page.groups;
          found++;
        }
        break;
      }
    }
    console.log(`${sem.key}: courses for ${found}/${moduleIds.length} modules`);
  }
  writeFileSync("data/courses.json", JSON.stringify(data, null, 2) + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
