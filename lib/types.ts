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
