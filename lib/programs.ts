import index from "@/data/programs/index.json";
import { LISTED_PROGRAM_IDS } from "./listed";
import type { Program, ProgramSummary } from "./types";

export const PROGRAMS = (index as ProgramSummary[]).filter((p) => LISTED_PROGRAM_IDS.includes(p.id));

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
