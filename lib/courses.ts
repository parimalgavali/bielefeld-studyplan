import type { Course, CourseData, CourseGroup, SemesterType } from "./types";

let cache: Promise<CourseData> | null = null;

export function loadCourses(): Promise<CourseData> {
  cache ??= import("@/data/courses.json").then((m) => m.default as unknown as CourseData);
  return cache;
}

export const termType = (key: string) => key.split(" ")[0] as SemesterType;

/** "WiSe 2024" -> "WiSe 24/25", "SoSe 2025" -> "SoSe 25" (same style as semester labels). */
export function termLabel(key: string): string {
  const [term, year] = key.split(" ");
  const yy = (y: number) => String(y % 100).padStart(2, "0");
  return term === "WiSe" ? `WiSe ${yy(Number(year))}/${yy(Number(year) + 1)}` : `SoSe ${yy(Number(year))}`;
}

export function moduleTerms(data: CourseData | null, ekvvId: string | undefined): [string, CourseGroup[]][] {
  const byTerm = (ekvvId && data?.modules[ekvvId]) || {};
  return [...data!.terms]
    .reverse()
    .flatMap((t) => (byTerm[t] ? [[t, byTerm[t]] as [string, CourseGroup[]]] : []));
}

export function findCourse(
  data: CourseData | null,
  ekvvId: string | undefined,
  term: string,
  id: string,
): Course | null {
  if (!data || !ekvvId) return null;
  for (const g of data.modules[ekvvId]?.[term] ?? []) {
    const c = g.courses.find((c) => c.id === id);
    if (c) return c;
  }
  return null;
}

/** Parallel groups (e.g. Übungen A–F) share a Belegnr; list them once. */
export function distinctCourses(group: CourseGroup): { course: Course; parallel: number }[] {
  const out: { course: Course; parallel: number }[] = [];
  for (const course of group.courses) {
    const same = out.find((o) => o.course.nr && o.course.nr === course.nr && o.course.type === course.type);
    if (same) same.parallel++;
    else out.push({ course, parallel: 0 });
  }
  return out;
}

export const courseUrl = (id: string) => `https://ekvv.uni-bielefeld.de/kvv_publ/publ/vd?id=${id}`;
