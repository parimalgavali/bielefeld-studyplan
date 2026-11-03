import type { Text } from "./types";

export interface Area {
  id: string;
  name: Text;
  /** LP that must be reached; with `max`, LP that may be counted at most. */
  lp: number;
  max?: boolean;
  codes?: string[];
  codePrefixes?: string[];
  note?: Text;
}

export interface ProgramRules {
  source: Text;
  sourceUrl: string;
  areas: Area[];
}

const WP_INF = [
  "AP",
  "APDC",
  "CD",
  "CIT",
  "CLS",
  "DS",
  "IG",
  "IS",
  "KI",
  "MC",
  "MTI",
  "NWS",
  "R",
  "SE",
  "SR",
  "SSC",
].flatMap((k) => [`39-Inf-WP-${k}`, `39-Inf-WP-${k}-x`]);

/** Hand-curated from the Fächerspezifische Bestimmungen; eKVV only says "Wahlpflicht". */
export const RULES: Record<string, ProgramRules> = {
  "462589642": {
    source: {
      de: "FsB Naturwissenschaftliche Informatik (M.Sc.) vom 01.04.2025, Ziffer 6",
      en: "FsB Naturwissenschaftliche Informatik (M.Sc.), 1 April 2025, section 6",
    },
    sourceUrl: "https://ekvv.uni-bielefeld.de/sinfo/publ/master-as/naturwissenschaftlicheinformatik/pdf",
    areas: [
      {
        id: "pflicht",
        name: { de: "Projekt und Masterarbeit", en: "Project and Master's thesis" },
        lp: 40,
        codes: ["39-M-Inf-P_NWI_a", "39-M-Inf-MA_NWI"],
      },
      {
        id: "vnwi",
        name: {
          de: "Vertiefung Naturwissenschaftliche Informatik",
          en: "Specialisation Informatics for Natural Sciences",
        },
        lp: 20,
        codes: ["39-M-Inf-ANWI", "39-M-Inf-ANWI-x", "39-M-Inf-ERT_NWI", "39-M-Inf-NWI", "39-M-Inf-NWI-x"],
      },
      {
        id: "vinf",
        name: { de: "Vertiefung Informatik", en: "Specialisation Computer Science" },
        lp: 15,
        codes: [
          "39-M-Inf-AI",
          "39-M-Inf-AI-x",
          "39-M-Inf-RAT",
          "39-M-Inf-RAT-x",
          "39-M-Inf-TA",
          "39-M-Inf-TA-x",
        ],
      },
      {
        id: "vnat",
        name: { de: "Vertiefung Naturwissenschaften", en: "Specialisation Natural Sciences" },
        lp: 15,
        codes: [
          "28-GP_a",
          "20-PM",
          "20-SM6",
          "20-AM5_a",
          "20-AM7_a",
          "20-BM2_b",
          "20-NB",
          "21-M16",
          "21-M33",
          "21-M34",
          "28-EP2",
          "28-SP_ub",
          "28-VKME_ub",
          "28-KME",
          "20-BM3",
          "20-BM4_b",
          "20-SM1",
          "20-SM13",
          "20-SM4",
          "20-SM41",
          "20-SM42",
          "20-SM43",
          "20-SM5",
          "21-M35",
          "28-AA1",
          "28-EKME_ub",
          "28-FO1",
          "28-Q_ub",
          "21-M-C7.1",
        ],
      },
      {
        id: "mathe",
        name: { de: "Mathematik und Datenanalyse", en: "Mathematics and Data Analysis" },
        lp: 10,
        codes: ["39-M-Inf-IMDA-x", "24-B-NDGL", "24-B-EZT", "24-B-NU"],
      },
      {
        id: "grundlagen",
        name: { de: "Grundlagenergänzung", en: "Foundations supplement" },
        lp: 10,
        codes: WP_INF,
        codePrefixes: ["20-", "21-", "28-"],
        note: {
          de: "Zweig 1: Module der Biologie, Chemie oder Physik. Zweig 2: Informatik-Module 39-Inf-WP-*. Welcher Zweig gilt, steht in deinem Zugangsbescheid.",
          en: "Branch 1: biology, chemistry or physics modules. Branch 2: computer science modules 39-Inf-WP-*. Your admission letter says which branch applies.",
        },
      },
      {
        id: "ierg",
        name: { de: "Individueller Ergänzungsbereich", en: "Individual supplementary area" },
        lp: 10,
        max: true,
        codes: ["39-M-Inf-MIKE"],
        note: {
          de: "Bis zu 10 LP aus beliebigen Lehrveranstaltungen (als eigenes Modul hinzufügen).",
          en: "Up to 10 LP from any courses (add them as a custom module).",
        },
      },
    ],
  },
};

export function areaCandidates(rules: ProgramRules, code: string): string[] {
  const exact = rules.areas.filter((a) => a.codes?.includes(code)).map((a) => a.id);
  const prefix = rules.areas
    .filter((a) => !exact.includes(a.id) && a.codePrefixes?.some((p) => code.startsWith(p)))
    .map((a) => a.id);
  return [...exact, ...prefix];
}
