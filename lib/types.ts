export type Lang = "de" | "en";
export type Text = Record<Lang, string>;
export type SemesterType = "WiSe" | "SoSe";
export type Turnus = "WiSe" | "SoSe" | "both" | "irregular";
export type Binding = "Pflicht" | "Wahlpflicht";

export interface Module {
  code: string;
  ekvvId: string;
  name: Text;
  lp: number;
  recommendedSemesters: number[];
  binding: Binding;
  group: Text;
  turnus: Turnus;
  turnusText: Text;
  faculty: Text;
  responsible: string;
  prerequisites: Text | null;
  recommendedKnowledge: Text | null;
}

export interface Program {
  id: string;
  name: Text;
  variant: string;
  degree: string;
  semesters: number;
  lp: number;
  startTerms: SemesterType[];
  /** FsB version label for programmes listed in several versions. */
  edition: Text | null;
  expiring: boolean;
  ekvvUrl: string;
  fsbUrl: string | null;
  scrapedAt: string;
  modules: Module[];
}

export interface ProgramSummary {
  id: string;
  name: Text;
  variant: string;
  degree: string;
  semesters: number;
  lp: number;
  edition: Text | null;
  expiring: boolean;
}

export interface Course {
  /** eKVV Veranstaltung id (`kvv_publ/publ/vd?id=`). */
  id: string;
  nr: string;
  title: string;
  type: string;
  lecturers: string;
  times: string;
}

/** Courses of one module element, e.g. "Datenbanken (Vorlesung)". */
export interface CourseGroup {
  element: string;
  courses: Course[];
}

/** Courses per module eKVV id, then per term key such as "WiSe 2024" (the year the semester starts). */
export interface CourseData {
  scrapedAt: string;
  terms: string[];
  modules: Record<string, Record<string, CourseGroup[]>>;
}
