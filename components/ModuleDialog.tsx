"use client";

import { useEffect, useRef } from "react";
import { tr } from "@/lib/i18n";
import { semesterLabel, type Plan, type PlanItem } from "@/lib/plan";
import type { ProgramRules } from "@/lib/rules";
import type { CourseGroup, Lang } from "@/lib/types";
import CourseList from "./CourseList";

interface Props {
  item: PlanItem;
  plan: Plan;
  lang: Lang;
  plannedIndex: number;
  rules: ProgramRules | null;
  areaOptions: string[];
  onClose: () => void;
  onAdd: (index: number) => void;
  onRemove: () => void;
  onArea: (area: string | null) => void;
  onDeleteCustom?: () => void;
  courses: [string, CourseGroup[]][] | null;
  firstTerm: string | null;
}

export default function ModuleDialog(props: Props) {
  const {
    item,
    plan,
    lang,
    plannedIndex,
    rules,
    areaOptions,
    onClose,
    onAdd,
    onRemove,
    onArea,
    onDeleteCustom,
    courses,
    firstTerm,
  } = props;
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const m = item.module;
  const turnus = m
    ? m.turnus === "both"
      ? tr(lang, "everySemester")
      : m.turnus === "irregular"
        ? m.turnusText[lang] || tr(lang, "irregular")
        : m.turnus
    : null;
  const rows: [string, string | null | undefined][] = m
    ? [
        [tr(lang, "lp"), String(m.lp)],
        [tr(lang, "turnus"), turnus],
        [tr(lang, "recommended"), m.recommendedSemesters.join(", ") || null],
        [tr(lang, "faculty"), m.faculty[lang]],
        [tr(lang, "responsible"), m.responsible],
        [tr(lang, "prerequisites"), m.prerequisites?.[lang] ?? m.prerequisites?.de],
        [tr(lang, "knowledge"), m.recommendedKnowledge?.[lang] ?? m.recommendedKnowledge?.de],
      ]
    : [[tr(lang, "lp"), String(item.lp)]];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-xl border border-neutral-800 bg-neutral-950 p-0 text-neutral-200 backdrop:bg-black/70"
    >
      <div className="p-5">
        <div className="mb-1 font-mono text-xs text-neutral-500">{item.code || tr(lang, "customTitle")}</div>
        <h2 className="mb-4 text-lg font-medium text-neutral-50">{item.name[lang] || item.name.de}</h2>
        <dl className="mb-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {rows
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-neutral-500">{k}</dt>
                <dd className="text-neutral-200">{v}</dd>
              </div>
            ))}
        </dl>

        {rules && areaOptions.length > 0 && (
          <label className="mb-4 flex items-center justify-between gap-3 text-sm">
            <span className="text-neutral-500">{tr(lang, "area")}</span>
            <select
              value={plan.areaOverrides[item.key] ?? ""}
              onChange={(e) => onArea(e.target.value || null)}
              className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1"
            >
              {item.module && <option value="">{tr(lang, "autoArea")}</option>}
              {areaOptions.map((id) => (
                <option key={id} value={id}>
                  {rules.areas.find((a) => a.id === id)?.name[lang]}
                </option>
              ))}
            </select>
          </label>
        )}

        {courses && (
          <section className="max-h-64 overflow-y-auto rounded-md border border-neutral-800 p-2">
            <h3 className="mb-1 text-sm font-medium text-neutral-200">{tr(lang, "courses")}</h3>
            <CourseList moduleKey={item.key} terms={courses} firstTerm={firstTerm} lang={lang} />
          </section>
        )}

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select
            aria-label={tr(lang, "addTo")}
            value={plannedIndex}
            onChange={(e) => onAdd(Number(e.target.value))}
            className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5"
          >
            <option value={-1} disabled>
              {tr(lang, "addTo")}
            </option>
            {plan.semesters.map((_, i) => (
              <option key={i} value={i}>
                {i + 1}. {semesterLabel(plan, i)}
              </option>
            ))}
          </select>
          {plannedIndex >= 0 && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-md px-2 py-1.5 text-neutral-400 hover:text-neutral-100"
            >
              {tr(lang, "removeFromPlan")}
            </button>
          )}
          {onDeleteCustom && (
            <button
              type="button"
              onClick={onDeleteCustom}
              className="rounded-md px-2 py-1.5 text-red-400/80 hover:text-red-300"
            >
              {tr(lang, "delete")}
            </button>
          )}
          <div className="flex-1" />
          {m && (
            <a
              href={`https://ekvv.uni-bielefeld.de/sinfo/publ/modul/${m.ekvvId}${lang === "en" ? "?lang=EN" : ""}`}
              target="_blank"
              rel="noreferrer"
              className="text-neutral-400 underline-offset-4 hover:text-neutral-100 hover:underline"
            >
              {tr(lang, "openEkvv")} ↗
            </a>
          )}
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="rounded-md border border-neutral-800 px-3 py-1.5 hover:bg-neutral-900"
          >
            {tr(lang, "close")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
