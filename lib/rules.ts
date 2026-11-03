import type { SemesterType, Text } from "./types";

export interface Area {
  id: string;
  name: Text;
  /** LP that must be reached; with `max`, LP that may be counted at most. */
  lp: number;
  max?: boolean;
  codes?: string[];
  codePrefixes?: string[];
  note?: Text;
  /** Badge shown on planned modules. */
  short?: Text;
}

export interface ProgramRules {
  source: Text;
  sourceUrl: string;
  areas: Area[];
  /** Last semester in which this FsB version applies. */
  validUntil?: { term: SemesterType; year: number };
  notice?: Text;
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
  "81435339": {
    source: {
      de: "FsB Naturwissenschaftliche Informatik (M.Sc.) vom 30.09.2016 i. d. F. vom 31.03.2023, Ziffer 6",
      en: "FsB Naturwissenschaftliche Informatik (M.Sc.), 30 Sept 2016 as amended 31 March 2023, section 6",
    },
    sourceUrl: "https://ekvv.uni-bielefeld.de/sinfo/publ/master-as/81435334/pdf",
    validUntil: { term: "WiSe", year: 2027 },
    notice: {
      de: "Auslaufende Version: für Einschreibungen von WiSe 16/17 bis SoSe 25 mit Abschluss bis Ende WiSe 27/28. Ab SoSe 28 gilt die FsB 2025 (früherer Wechsel auf Antrag möglich).",
      en: "Expiring version: for students enrolled from WiSe 16/17 to SoSe 25 who finish by the end of WiSe 27/28. From SoSe 28 the FsB 2025 applies (switching earlier is possible on request).",
    },
    areas: [
      {
        id: "pflicht",
        name: { de: "Projekt und Masterarbeit", en: "Project and Master's thesis" },
        lp: 40,
        codes: ["39-M-Inf-P1_NWI", "39-M-Inf-MA_NWI"],
      },
      {
        id: "grundlagen",
        name: { de: "Grundlagen Ergänzung", en: "Foundations supplement" },
        lp: 20,
        codes: [
          ...["10", "11", "12", "13_b", "AAE", "AB", "AGAE", "AIAI", "AKS", "AR", "ART", "BMI", "BV", "CG"]
            .concat(["CV", "DB2", "DKI", "DM", "EAA", "EMS", "FL", "FL_a", "IR", "IV", "KR", "KRY", "MK"])
            .concat(["ML", "MR_a", "NE1", "NN", "NP", "RM", "RT_a", "RT2_a", "SE_a", "SNLP", "VHM", "VR"])
            .map((k) => `39-Inf-${k}`),
          "39-M-Inf-PS",
        ],
        note: {
          de: "Mindestens 10 LP davon benotet; 10 LP zählen nicht zur Gesamtnote.",
          en: "At least 10 LP of these graded; 10 LP do not count towards the final grade.",
        },
      },
      {
        id: "vinf",
        name: { de: "Vertiefung Informatik", en: "Specialisation Computer Science" },
        lp: 20,
        codes: [
          "39-Inf-IZV",
          "39-Inf-SAB_a",
          ...["ABI", "ADA", "ADS", "AG", "AIS", "AMN", "ASE", "BM", "CA", "CS", "DL", "ES", "FA", "GMP"]
            .concat(["IMD", "ISB", "IT_S", "K", "KR", "KR_P", "LEA", "MI", "MWV", "NE2", "PDV", "RNA"])
            .concat(["RPRS", "S", "SSV", "SW", "TMKD", "VBD", "VDM", "VHC_a", "VKI", "VML", "VNN"])
            // MBP is not in the FsB pool; its eKVV module page assigns it to "Vertiefung Informatik".
            .concat(["MBP"])
            .map((k) => `39-M-Inf-${k}`),
        ],
      },
      {
        id: "vnat",
        name: { de: "Vertiefung Naturwissenschaften", en: "Specialisation Natural Sciences" },
        lp: 20,
        codes: ["39-M-Inf-RDM", "39-VN", "39-VN_5b", "39-VN_10b", "39-VN_10u", "39-VN_15u"],
        codePrefixes: ["20-", "21-", "24-", "28-"],
        note: {
          de: "Auch Bachelor- oder Mastermodule aus Biologie, Chemie, Physik, Mathematik oder Molekularer Biotechnologie (39-VN).",
          en: "Also Bachelor's or Master's modules from biology, chemistry, physics, mathematics or Molecular Biotechnology (39-VN).",
        },
      },
      {
        id: "vmath",
        name: { de: "Vertiefung Mathematik für Naturwissenschaften", en: "Mathematics for Natural Sciences" },
        lp: 10,
        codes: ["39-M-Inf-VMNT", "39-M-Inf-MB", "39-Inf-ASB", "39-Inf-WR"],
      },
      {
        id: "ierg",
        name: { de: "Individueller Ergänzungsbereich", en: "Individual supplementary area" },
        lp: 10,
        codes: ["39-M-Inf-MIKE"],
        note: {
          de: "10 LP aus beliebigen Lehrveranstaltungen (als eigenes Modul hinzufügen).",
          en: "10 LP from any courses (add them as a custom module).",
        },
      },
    ],
  },
};

const SHORT: Record<string, Text> = {
  pflicht: { de: "Pflicht", en: "core" },
  vnwi: { de: "V-NWI", en: "NWI" },
  vinf: { de: "V-Inf", en: "CS" },
  vnat: { de: "V-Nat", en: "science" },
  mathe: { de: "Mathe", en: "maths" },
  vmath: { de: "Mathe", en: "maths" },
  grundlagen: { de: "Grundl.", en: "found." },
  ierg: { de: "IEB", en: "indiv." },
};
for (const r of Object.values(RULES)) for (const a of r.areas) a.short ??= SHORT[a.id];

export function areaCandidates(rules: ProgramRules, code: string): string[] {
  // eKVV lists re-versioned modules as e.g. 39-Inf-NN_ver1; the FsB pools name only 39-Inf-NN.
  const base = code.replace(/_ver\d+$/, "");
  const exact = rules.areas
    .filter((a) => a.codes?.includes(code) || a.codes?.includes(base))
    .map((a) => a.id);
  const prefix = rules.areas
    .filter((a) => !exact.includes(a.id) && a.codePrefixes?.some((p) => code.startsWith(p)))
    .map((a) => a.id);
  return [...exact, ...prefix];
}
