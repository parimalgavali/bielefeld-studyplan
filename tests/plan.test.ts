import { describe, expect, it } from "vitest";
import {
  addCourse,
  addToSemester,
  areaProgress,
  decodePlan,
  emptyPlan,
  encodePlan,
  missingPflicht,
  prerequisiteCodes,
  removeCourse,
  removeFromPlan,
  semesterLabel,
  semestersAfter,
  semesterTerm,
  totalLp,
  warnings,
} from "../lib/plan";
import { areaCandidates, areaChoices, RULES } from "../lib/rules";
import type { Module, Program } from "../lib/types";

const mod = (code: string, lp: number, extra: Partial<Module> = {}): Module => ({
  code,
  ekvvId: code,
  name: { de: code, en: code },
  lp,
  recommendedSemesters: [1],
  binding: "Wahlpflicht",
  group: { de: "", en: "" },
  turnus: "both",
  turnusText: { de: "", en: "" },
  faculty: { de: "", en: "" },
  responsible: "",
  prerequisites: null,
  recommendedKnowledge: null,
  ...extra,
});

const program: Program = {
  id: "462589642",
  name: { de: "NWI", en: "NWI" },
  variant: "",
  degree: "Master of Science",
  semesters: 4,
  edition: null,
  expiring: false,
  lp: 120,
  startTerms: ["WiSe", "SoSe"],
  ekvvUrl: "",
  fsbUrl: null,
  scrapedAt: "2026-11-03",
  modules: [
    mod("39-M-Inf-P_NWI_a", 10, { binding: "Pflicht" }),
    mod("39-M-Inf-MA_NWI", 30, { binding: "Pflicht" }),
    mod("39-M-Inf-AI-x", 10),
    mod("39-M-Inf-TA", 5),
    mod("39-M-Inf-RAT", 5),
    mod("20-BM2_b", 10, { turnus: "WiSe" }),
    mod("20-SM1", 10, { prerequisites: { de: "20-AM5(_a)", en: "20-AM5(_a)" } }),
    mod("20-AM5_a", 10, {
      prerequisites: { de: "20-BM2(_a/_b) und eines der Module 20-BM1, 20-BM3", en: "" },
    }),
  ],
};

describe("semesters", () => {
  it("alternates WiSe and SoSe from the start term", () => {
    const p = emptyPlan(program, 2025, "WiSe");
    expect([0, 1, 2, 3].map((i) => semesterTerm(p, i))).toEqual(["WiSe", "SoSe", "WiSe", "SoSe"]);
    expect([0, 1, 2, 3].map((i) => semesterLabel(p, i))).toEqual([
      "WiSe 25/26",
      "SoSe 26",
      "WiSe 26/27",
      "SoSe 27",
    ]);
    const s = emptyPlan(program, 2026, "SoSe");
    expect([0, 1, 2].map((i) => semesterLabel(s, i))).toEqual(["SoSe 26", "WiSe 26/27", "SoSe 27"]);
  });
});

describe("checks", () => {
  it("sums LP and lists missing Pflicht modules", () => {
    let p = emptyPlan(program, 2025);
    p = addToSemester(p, "39-M-Inf-P_NWI_a", 2);
    p = addToSemester(p, "39-M-Inf-AI-x", 0);
    expect(totalLp(program, p)).toBe(20);
    expect(missingPflicht(program, p).map((m) => m.code)).toEqual(["39-M-Inf-MA_NWI"]);
  });

  it("moves a module instead of duplicating it", () => {
    let p = addToSemester(emptyPlan(program, 2025), "39-M-Inf-TA", 0);
    p = addToSemester(p, "39-M-Inf-TA", 1);
    expect(p.semesters[0]).toEqual([]);
    expect(p.semesters[1]).toEqual(["39-M-Inf-TA"]);
  });

  it("warns about Turnus and prerequisites", () => {
    let p = emptyPlan(program, 2025);
    p = addToSemester(p, "20-BM2_b", 1);
    p = addToSemester(p, "20-SM1", 1);
    const w = warnings(program, p);
    expect(w).toContainEqual({ kind: "turnus", key: "20-BM2_b", semester: 1, offered: "WiSe" });
    expect(w).toContainEqual({ kind: "prerequisite", key: "20-SM1", semester: 1, missing: ["20-AM5_a"] });
    p = addToSemester(p, "20-AM5_a", 0);
    expect(warnings(program, p).some((x) => x.kind === "prerequisite" && x.key === "20-SM1")).toBe(false);
  });

  it("extracts module codes from prerequisite text", () => {
    const known = new Set(["20-BM2_b", "20-BM1", "20-BM3"]);
    expect(prerequisiteCodes("20-BM2(_a/_b) und eines der Module 20-BM1, 20-BM3", known)).toEqual([
      "20-BM2",
      "20-BM1",
      "20-BM3",
    ]);
  });
});

describe("NWI area rules", () => {
  it("fills areas from the FsB pools, preferring an area the module fits into", () => {
    let p = emptyPlan(program, 2025);
    for (const c of ["39-M-Inf-AI-x", "39-M-Inf-TA", "39-M-Inf-RAT", "20-BM2_b", "20-AM5_a"]) {
      p = addToSemester(p, c, 0);
    }
    const byId = Object.fromEntries(areaProgress(program, p, RULES["462589642"]).map((a) => [a.id, a]));
    expect(byId.vinf.planned).toBe(20);
    expect(byId.vnat.planned).toBe(10);
    expect(byId.grundlagen.planned).toBe(10);
    p = { ...p, areaOverrides: { "20-AM5_a": "vnat" } };
    const again = Object.fromEntries(areaProgress(program, p, RULES["462589642"]).map((a) => [a.id, a]));
    expect(again.vnat.planned).toBe(20);
    expect(again.grundlagen.planned).toBe(0);
  });
});

describe("old NWI FsB (2016) rules", () => {
  const old = RULES["81435339"];
  it("maps pool modules, re-versioned codes and science prefixes to areas", () => {
    expect(areaCandidates(old, "39-Inf-ML")).toEqual(["grundlagen"]);
    expect(areaCandidates(old, "39-Inf-NN_ver2")).toEqual(["grundlagen"]);
    expect(areaCandidates(old, "39-M-Inf-DL")).toEqual(["vinf"]);
    expect(areaCandidates(old, "39-Inf-WR")).toEqual(["vmath"]);
    expect(areaCandidates(old, "20-BM2_b")).toEqual(["vnat"]);
    expect(areaCandidates(old, "39-M-Inf-P1_NWI")).toEqual(["pflicht"]);
    expect(areaCandidates(old, "39-Inf-BDS")).toEqual([]);
    expect(areaChoices(old, "39-Inf-BDS")).toEqual(["grundlagen", "vinf", "vnat", "vmath", "ierg"]);
    expect(areaChoices(old, "39-Inf-ML")).toEqual(["grundlagen"]);
    expect(old.areas.reduce((s, a) => s + a.lp, 0)).toBe(120);
  });

  it("flags planned semesters after the last valid semester", () => {
    let p = emptyPlan(program, 2026);
    p = { ...p, semesters: [["a"], [], ["b"], ["c"]] };
    // WiSe 26/27, SoSe 27, WiSe 27/28, SoSe 28
    expect(semestersAfter(p, old.validUntil!)).toEqual([3]);
  });
});

describe("share link", () => {
  it("round-trips a plan including umlauts", () => {
    let p = emptyPlan(program, 2025);
    p = addToSemester(p, "39-M-Inf-TA", 0);
    p = { ...p, custom: [{ id: "a", name: "Übung Ökologie", lp: 3 }] };
    expect(decodePlan(encodePlan(p))).toEqual(p);
    expect(decodePlan("not-valid")).toBeNull();
  });

  it("round-trips picked courses and reads old links without them", () => {
    let p = emptyPlan(program, 2025);
    p = addCourse(p, "39-M-Inf-TA", { term: "WiSe 2025", id: "123" }, 0);
    expect(decodePlan(encodePlan(p))).toEqual(p);
    const old: Partial<typeof p> = emptyPlan(program, 2025);
    delete old.courses;
    expect(decodePlan(encodePlan(old as typeof p))?.courses).toEqual({});
  });
});

describe("courses", () => {
  it("places the parent module once and counts its LP once", () => {
    let p = emptyPlan(program, 2025);
    p = addCourse(p, "39-M-Inf-TA", { term: "WiSe 2025", id: "1" }, 0);
    p = addCourse(p, "39-M-Inf-TA", { term: "WiSe 2025", id: "2" }, 0);
    p = addCourse(p, "39-M-Inf-TA", { term: "WiSe 2025", id: "2" }, 0);
    expect(p.semesters[0]).toEqual(["39-M-Inf-TA"]);
    expect(p.courses?.["39-M-Inf-TA"]).toHaveLength(2);
    expect(totalLp(program, p)).toBe(5);
    p = removeCourse(p, "39-M-Inf-TA", { term: "WiSe 2025", id: "1" });
    expect(p.courses?.["39-M-Inf-TA"]).toEqual([{ term: "WiSe 2025", id: "2" }]);
    expect(removeFromPlan(p, "39-M-Inf-TA").courses?.["39-M-Inf-TA"]).toBeUndefined();
  });

  it("warns when a course's term differs from the semester", () => {
    let p = emptyPlan(program, 2025);
    p = addCourse(p, "39-M-Inf-TA", { term: "WiSe 2025", id: "1" }, 1);
    expect(warnings(program, p)).toContainEqual(
      expect.objectContaining({ kind: "course-term", semester: 1, offered: "WiSe" }),
    );
  });
});
