import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  parseModule,
  parseModuleList,
  parseProgramOverview,
  parseSemesters,
  parseTurnus,
} from "../lib/ekvv/parse";

const fixture = (name: string) => readFileSync(`tests/fixtures/${name}.html`, "utf-8");

describe("parseProgramOverview", () => {
  it("reads the NWI master overview", () => {
    const p = parseProgramOverview(fixture("variante-462589642"));
    expect(p.name).toBe("Naturwissenschaftliche Informatik");
    expect(p.variant).toBe("");
    expect(p.degree).toBe("Master of Science");
    expect(p.semesters).toBe(4);
    expect(p.lp).toBe(120);
    expect(p.startTerms).toEqual(["WiSe", "SoSe"]);
    expect(p.fsbPath).toBe("/sinfo/publ/master-as/naturwissenschaftlicheinformatik/pdf");
  });

  it("reads the variant label of the Informatik Kernfach", () => {
    const p = parseProgramOverview(fixture("variante-453998098"));
    expect(p.name).toBe("Informatik");
    expect(p.variant).toBe("Kernfach (fw)");
    expect(p.semesters).toBe(6);
  });
});

describe("parseModuleList", () => {
  it("parses every row with LP, semesters and binding", () => {
    const rows = parseModuleList(fixture("variante-462589642-m"));
    expect(rows.length).toBe(79);
    expect(rows[0]).toEqual({
      code: "39-M-Inf-P_NWI_a",
      ekvvId: "544369486",
      name: "Projekt",
      lp: 10,
      recommendedSemesters: [3],
      binding: "Pflicht",
      group: "",
    });
    const ap = rows.find((r) => r.code === "39-Inf-WP-AP");
    expect(ap?.binding).toBe("Wahlpflicht");
    expect(ap?.recommendedSemesters).toEqual([1, 2]);
    expect(rows.at(-1)?.group).toBe("Modularisierter individueller Kompetenz-Erwerb (MiKE)");
  });

  it("returns English names from the English page", () => {
    const rows = parseModuleList(fixture("variante-462589642-m-en"));
    expect(rows.find((r) => r.code === "39-M-Inf-MA_NWI")?.name).toBe("Master's Thesis");
  });

  it("keeps profile headings as groups", () => {
    const groups = new Set(parseModuleList(fixture("variante-453998098-m")).map((r) => r.group));
    expect(groups).toContain("Profil Bioinformatik");
    expect(groups).toContain("Profilübergreifende Pflichtmodule");
  });
});

describe("parseModule", () => {
  it("reads module details in German and English", () => {
    const de = parseModule(fixture("modul-544369486"));
    expect(de).toMatchObject({
      code: "39-M-Inf-P_NWI_a",
      name: "Projekt",
      turnusText: "Jedes Semester",
      faculty: "Technische Fakultät",
      prerequisites: null,
    });
    const en = parseModule(fixture("modul-544369486-en"));
    expect(en.name).toBe("Project");
    expect(en.turnusText).toBe("Every semester");
  });

  it("reads a winter-only module", () => {
    const m = parseModule(fixture("modul-120190431"));
    expect(m.code).toBe("20-BM2_b");
    expect(parseTurnus(m.turnusText)).toBe("WiSe");
  });
});

describe("helpers", () => {
  it("parses recommended semesters", () => {
    expect(parseSemesters("1. o. 2. o. 3.")).toEqual([1, 2, 3]);
    expect(parseSemesters("k.A.")).toEqual([]);
  });

  it("normalises Turnus text", () => {
    expect(parseTurnus("Jedes Sommersemester")).toBe("SoSe");
    expect(parseTurnus("Every winter semester")).toBe("WiSe");
    expect(parseTurnus("Unregelmäßig")).toBe("irregular");
  });
});
