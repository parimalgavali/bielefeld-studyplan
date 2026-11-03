import type { Text } from "../lib/types";

export interface ProgramConfig {
  /** eKVV "Studiengangsvariante" ID (https://ekvv.uni-bielefeld.de/sinfo/publ/variante/<id>). */
  id: string;
  edition?: Text;
}

export const PROGRAMS: ProgramConfig[] = [
  { id: "462589642", edition: { de: "FsB 2025", en: "FsB 2025" } }, // M.Sc. Naturwissenschaftliche Informatik
  { id: "81435339", edition: { de: "FsB 2016, auslaufend", en: "FsB 2016, expiring" } }, // same, old FsB
  { id: "453996665" }, // B.Sc. Naturwissenschaftliche Informatik
  { id: "453998098" }, // B.Sc. Informatik, Kernfach
  { id: "405818172" }, // B.Sc. Künstliche Intelligenz und Kognitive Informatik
  { id: "569518710" }, // M.Sc. Data Science
  { id: "366747897" }, // M.Sc. Intelligente Interaktive Systeme
  { id: "189447354" }, // M.Sc. Genome Based Systems Biology
];

export const PROGRAM_IDS = PROGRAMS.map((p) => p.id);
