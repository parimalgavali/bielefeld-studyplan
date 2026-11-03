/** Soft per-area colours; literal class names so Tailwind can see them. */
const TONES: Record<string, { badge: string; bar: string; dot: string }> = {
  core: { badge: "bg-area-core/12 text-area-core", bar: "bg-area-core", dot: "bg-area-core" },
  violet: { badge: "bg-area-violet/12 text-area-violet", bar: "bg-area-violet", dot: "bg-area-violet" },
  sky: { badge: "bg-area-sky/12 text-area-sky", bar: "bg-area-sky", dot: "bg-area-sky" },
  teal: { badge: "bg-area-teal/12 text-area-teal", bar: "bg-area-teal", dot: "bg-area-teal" },
  amber: { badge: "bg-area-amber/12 text-area-amber", bar: "bg-area-amber", dot: "bg-area-amber" },
  peach: { badge: "bg-area-peach/12 text-area-peach", bar: "bg-area-peach", dot: "bg-area-peach" },
  slate: { badge: "bg-area-slate/14 text-area-slate", bar: "bg-area-slate", dot: "bg-area-slate" },
};

const AREA_TONE: Record<string, keyof typeof TONES> = {
  pflicht: "core",
  vnwi: "violet",
  vinf: "sky",
  vnat: "teal",
  mathe: "amber",
  vmath: "amber",
  grundlagen: "peach",
  ierg: "slate",
};

export function areaTone(areaId: string) {
  return TONES[AREA_TONE[areaId] ?? "slate"];
}
