import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { distinctCourses, termLabel } from "../lib/courses";
import { parseModuleCourses, parseSemesterList, termKey } from "../lib/ekvv/parse";

const fixture = (name: string) => readFileSync(`tests/fixtures/${name}`, "utf-8");

describe("parseModuleCourses", () => {
  it("reads the courses of each module element and skips exams", () => {
    const page = parseModuleCourses(fixture("moduldetail-26787733-wise2024.html"));
    expect(page.term).toBe("WiSe 2024");
    expect(page.groups.map((g) => g.element)).toEqual([
      "Einführung in die Datenbanken und Modellierung (Vorlesung)",
      "Einführung in die Datenbanken und Modellierung (Übung)",
    ]);
    expect(page.groups[0].courses).toEqual([
      expect.objectContaining({
        nr: "392156",
        title: "Einführung Datenbanken und Modellierung",
        type: "V",
        lecturers: "Ell, Geromel",
        times: "Do 14-16 in H14 [07.10.2024-31.01.2025]",
      }),
    ]);
    expect(page.groups[0].courses[0].id).toMatch(/^\d+$/);
    expect(page.groups[1].courses).toHaveLength(7);
  });

  it("returns no groups when nothing is offered that semester", () => {
    const page = parseModuleCourses(fixture("moduldetail-26787733-sose2026.html"));
    expect(page.term).toBe("SoSe 2026");
    expect(page.groups).toEqual([]);
  });

  it("reads a summer-semester module", () => {
    const page = parseModuleCourses(fixture("moduldetail-27461574-sose2025.html"));
    expect(page.term).toBe("SoSe 2025");
    expect(page.groups.map((g) => g.courses[0].type)).toEqual(["V", "Ü"]);
  });
});

describe("termKey", () => {
  it("uses the year the semester starts", () => {
    expect(termKey("WiSe 2024/2025")).toBe("WiSe 2024");
    expect(termKey(" SoSe 2025 ")).toBe("SoSe 2025");
    expect(termKey("Frühere...")).toBeNull();
  });
});

describe("parseSemesterList", () => {
  it("reads term keys and eKVV semester ids", () => {
    const html = `<ul>
      <li><a href="semester_AuswahlAct?sem_id=413271031&amp;bu=x">WiSe 2026/2027</a></li>
      <li><a href="semester_AuswahlAct?sem_id=413269727&amp;bu=x">SoSe 2026</a></li>
      <li><a href="semester_AuswahlAct?sem_id=413269727&amp;bu=y">SoSe 2026</a></li>
      <li><a href="Home.jsp">Home</a></li>
    </ul>`;
    expect(parseSemesterList(html)).toEqual([
      { key: "WiSe 2026", semId: "413271031" },
      { key: "SoSe 2026", semId: "413269727" },
    ]);
  });
});

describe("course helpers", () => {
  it("labels terms like semesters", () => {
    expect(termLabel("WiSe 2024")).toBe("WiSe 24/25");
    expect(termLabel("SoSe 2025")).toBe("SoSe 25");
  });

  it("lists parallel exercise groups once", () => {
    const page = parseModuleCourses(fixture("moduldetail-26787733-wise2024.html"));
    const distinct = distinctCourses(page.groups[1]);
    expect(distinct.length).toBeLessThan(page.groups[1].courses.length);
    expect(distinct.reduce((n, d) => n + 1 + d.parallel, 0)).toBe(page.groups[1].courses.length);
  });
});
