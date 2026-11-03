"use client";

import { tr } from "@/lib/i18n";
import {
  areaProgress,
  missingPflicht,
  resolveItem,
  semesterLabel,
  semestersAfter,
  totalLp,
  warnings,
  type Plan,
} from "@/lib/plan";
import type { ProgramRules } from "@/lib/rules";
import type { Lang, Program } from "@/lib/types";

interface Props {
  program: Program;
  plan: Plan;
  rules: ProgramRules | null;
  lang: Lang;
  onOpen: (key: string) => void;
}

function Bar({ value, max, cap }: { value: number; max: number; cap?: boolean }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  const over = cap && value > max;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-neutral-800">
      <div
        className={`h-full rounded-full ${over ? "bg-amber-400" : value >= max ? "bg-emerald-400" : "bg-neutral-300"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function ProgressPanel({ program, plan, rules, lang, onOpen }: Props) {
  const total = totalLp(program, plan);
  const missing = missingPflicht(program, plan);
  const warns = warnings(program, plan);
  const late = rules?.validUntil ? semestersAfter(plan, rules.validUntil) : [];
  const lastLabel = rules?.validUntil
    ? semesterLabel({ startTerm: rules.validUntil.term, startYear: rules.validUntil.year }, 0)
    : "";
  const areas = rules ? areaProgress(program, plan, rules) : null;
  const groups = !rules
    ? [...new Set(program.modules.map((m) => m.group[lang] || m.group.de))].map((g) => ({
        g,
        lp: plan.semesters
          .flat()
          .map((k) => resolveItem(program, plan, k))
          .filter((i) => i?.module && (i.module.group[lang] || i.module.group.de) === g)
          .reduce((s, i) => s + (i?.lp ?? 0), 0),
      }))
    : [];

  return (
    <div className="flex flex-col gap-6 text-sm">
      <section>
        <div className="mb-1.5 flex justify-between">
          <span className="text-neutral-400">{tr(lang, "total")}</span>
          <span className="tabular-nums text-neutral-100">
            {total} / {program.lp}
          </span>
        </div>
        <Bar value={total} max={program.lp} />
      </section>

      {areas && rules && (
        <section>
          <h3 className="mb-3 text-xs uppercase tracking-wide text-neutral-500">{tr(lang, "areas")}</h3>
          <ul className="flex flex-col gap-3">
            {areas.map((a) => (
              <li key={a.id}>
                <div className="mb-1 flex justify-between gap-3">
                  <span className="text-neutral-300">{a.name[lang]}</span>
                  <span className="shrink-0 tabular-nums text-neutral-400">
                    {a.planned} / {a.max ? `${tr(lang, "upTo")} ` : ""}
                    {a.required}
                  </span>
                </div>
                <Bar value={a.planned} max={a.required} cap={a.max} />
                {a.note && <p className="mt-1 text-xs text-neutral-500">{a.note[lang]}</p>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-neutral-500">
            {tr(lang, "areasSource")}:{" "}
            <a
              href={rules.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {rules.source[lang]}
            </a>
          </p>
        </section>
      )}

      {groups.length > 1 && (
        <section>
          <h3 className="mb-3 text-xs uppercase tracking-wide text-neutral-500">{tr(lang, "groups")}</h3>
          <ul className="flex flex-col gap-1">
            {groups.map(({ g, lp }) => (
              <li key={g} className="flex justify-between gap-3">
                <span className="truncate text-neutral-300">{g || tr(lang, "noGroup")}</span>
                <span className="tabular-nums text-neutral-400">{lp} LP</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-xs uppercase tracking-wide text-neutral-500">
          {tr(lang, "missingPflicht")} ({missing.length})
        </h3>
        {missing.length === 0 ? (
          <p className="text-neutral-500">{tr(lang, "none")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {missing.map((m) => (
              <li key={m.code}>
                <button
                  type="button"
                  onClick={() => onOpen(m.code)}
                  className="text-left text-neutral-300 hover:text-white"
                >
                  <span className="font-mono text-xs text-neutral-500">{m.code}</span>{" "}
                  {m.name[lang] || m.name.de}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs uppercase tracking-wide text-neutral-500">
          {tr(lang, "warningsTitle")} ({warns.length + late.length})
        </h3>
        {warns.length + late.length === 0 ? (
          <p className="text-neutral-500">{tr(lang, "none")}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {late.map((i) => (
              <li key={`late-${i}`} className="text-amber-300/90">
                {i + 1}. {semesterLabel(plan, i)} {tr(lang, "afterValidity", { last: lastLabel })}
              </li>
            ))}
            {warns.map((w, i) => {
              const item = resolveItem(program, plan, w.key);
              const name = item ? item.name[lang] || item.name.de : w.key;
              const text =
                w.kind === "turnus"
                  ? tr(lang, "turnusWarning", { term: w.offered })
                  : w.kind === "prerequisite"
                    ? tr(lang, "prereqWarning", { codes: w.missing.join(", ") })
                    : "";
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => onOpen(w.key)}
                    className="text-left text-amber-300/90 hover:text-amber-200"
                  >
                    {"semester" in w ? `${w.semester + 1}. ${semesterLabel(plan, w.semester)} · ` : ""}
                    {name} {text}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
