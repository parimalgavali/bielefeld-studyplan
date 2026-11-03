import index from "@/data/programs/index.json";
import type { Program, ProgramSummary } from "./types";

/** Programmes shown in the picker. The others are scraped but hidden until their FsB rules are written. */
const LISTED = ["462589642", "81435339"];

export const PROGRAMS = (index as ProgramSummary[]).filter((p) => LISTED.includes(p.id));

export async function loadProgram(id: string): Promise<Program> {
  const mod = await import(`@/data/programs/${id}.json`);
  return mod.default as Program;
}

export function degreeShort(degree: string): string {
  if (/Master of Science/.test(degree)) return "M.Sc.";
  if (/Master of Arts/.test(degree)) return "M.A.";
  if (/Bachelor of Science/.test(degree)) return "B.Sc.";
  if (/Bachelor of Arts/.test(degree)) return "B.A.";
  if (/Bachelor/.test(degree)) return "B.";
  return degree;
}
