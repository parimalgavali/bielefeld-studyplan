"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { tr } from "@/lib/i18n";
import {
  addToSemester,
  assignAreas,
  CUSTOM_PREFIX,
  decodePlan,
  emptyPlan,
  encodePlan,
  findModule,
  profileGroups,
  removeFromPlan,
  resolveItem,
  semesterLabel,
  semesterLp,
  warnings,
  type Plan,
} from "@/lib/plan";
import { degreeShort, loadProgram, PROGRAMS } from "@/lib/programs";
import { areaChoices, RULES } from "@/lib/rules";
import type { Lang, Program, SemesterType } from "@/lib/types";
import ModuleChip from "./ModuleChip";
import ModuleDialog from "./ModuleDialog";
import ProgressPanel from "./ProgressPanel";
import SemesterCard from "./SemesterCard";
import Sidebar from "./Sidebar";

const STORAGE_KEY = "bielefeld-studyplan:v1";
const LANG_KEY = "bielefeld-studyplan:lang";
const THEME_KEY = "bielefeld-studyplan:theme";
const DEFAULT_PROGRAM = "462589642";

function currentStartYear(): number {
  const now = new Date();
  return now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
}

function loadStored(): Record<string, Plan> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").plans ?? {};
  } catch {
    return {};
  }
}

export default function Planner() {
  const [lang, setLang] = useState<Lang>("en");
  const [programId, setProgramId] = useState<string | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [tab, setTab] = useState<"modules" | "progress">("modules");
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = loadStored();
    const shared = new URLSearchParams(window.location.hash.slice(1)).get("plan");
    const sharedPlan = shared ? decodePlan(shared) : null;
    let active = (JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").active as string) ?? DEFAULT_PROGRAM;
    if (sharedPlan && PROGRAMS.some((p) => p.id === sharedPlan.programId)) {
      stored[sharedPlan.programId] = sharedPlan;
      active = sharedPlan.programId;
      history.replaceState(null, "", window.location.pathname);
    }
    if (!PROGRAMS.some((p) => p.id === active)) active = DEFAULT_PROGRAM;
    const savedLang = localStorage.getItem(LANG_KEY);
    setLang(
      savedLang === "de" || savedLang === "en"
        ? savedLang
        : navigator.language.startsWith("de")
          ? "de"
          : "en",
    );
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    setPlans(stored);
    setProgramId(active);
  }, []);

  useEffect(() => {
    if (!programId) return;
    let cancelled = false;
    loadProgram(programId).then((p) => !cancelled && setProgram(p));
    return () => {
      cancelled = true;
    };
  }, [programId]);

  useEffect(() => {
    if (programId) localStorage.setItem(STORAGE_KEY, JSON.stringify({ active: programId, plans }));
  }, [plans, programId]);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const plan = useMemo(() => {
    if (!program) return null;
    return plans[program.id] ?? emptyPlan(program, currentStartYear());
  }, [plans, program]);

  const update = useCallback(
    (fn: (p: Plan) => Plan) => {
      if (!program || !plan) return;
      setPlans((all) => ({ ...all, [program.id]: fn(all[program.id] ?? plan) }));
    },
    [program, plan],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  if (!program || !plan) {
    return (
      <div className="flex h-screen items-center justify-center text-neutral-500">{tr(lang, "loading")}</div>
    );
  }

  const rules = RULES[program.id] ?? null;
  const warnByKey = new Map<string, string>();
  for (const w of warnings(program, plan)) {
    if (w.kind === "turnus") warnByKey.set(w.key, tr(lang, "turnusWarning", { term: w.offered }));
    if (w.kind === "prerequisite")
      warnByKey.set(w.key, tr(lang, "prereqWarning", { codes: w.missing.join(", ") }));
  }
  const areaOf = rules ? assignAreas(program, plan, rules) : {};
  const profiles = profileGroups(program);
  const openItem = openKey ? resolveItem(program, plan, openKey) : null;

  const onDragStart = (e: DragStartEvent) => setDragKey((e.active.data.current?.key as string) ?? null);
  const onDragEnd = (e: DragEndEvent) => {
    setDragKey(null);
    const key = e.active.data.current?.key as string | undefined;
    const over = e.over?.id;
    if (!key || !over) return;
    if (over === "sidebar") update((p) => removeFromPlan(p, key));
    else if (typeof over === "string" && over.startsWith("semester-")) {
      update((p) => addToSemester(p, key, Number(over.slice("semester-".length))));
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
    setTheme(next);
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#plan=${encodePlan(plan)}`;
    try {
      await navigator.clipboard.writeText(url);
      flash(tr(lang, "copied"));
    } catch {
      window.prompt(tr(lang, "share"), url);
    }
  };

  const select =
    "rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-200 outline-none focus:border-neutral-600";
  const years = Array.from({ length: 7 }, (_, i) => currentStartYear() - 4 + i);

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex min-h-screen flex-col lg:h-screen">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-neutral-900 px-4 py-3 lg:px-6">
          <div className="mr-auto">
            <h1 className="text-base font-medium text-neutral-50">{tr(lang, "title")}</h1>
            <p className="text-xs text-neutral-500">{tr(lang, "tagline")}</p>
          </div>
          <select
            aria-label={tr(lang, "program")}
            value={program.id}
            onChange={(e) => setProgramId(e.target.value)}
            className={`${select} max-w-[32rem]`}
          >
            {PROGRAMS.map((p) => (
              <option key={p.id} value={p.id}>
                {degreeShort(p.degree)} {p.name[lang] || p.name.de}
                {p.variant ? ` – ${p.variant}` : ""}
                {p.edition ? ` · ${p.edition[lang]}` : ""}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1.5">
            <select
              aria-label={tr(lang, "start")}
              value={plan.startTerm}
              onChange={(e) => update((p) => ({ ...p, startTerm: e.target.value as SemesterType }))}
              className={select}
            >
              <option value="WiSe">WiSe</option>
              <option value="SoSe">SoSe</option>
            </select>
            <select
              aria-label={`${tr(lang, "start")} year`}
              value={plan.startYear}
              onChange={(e) => update((p) => ({ ...p, startYear: Number(e.target.value) }))}
              className={select}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          {profiles.length > 1 && (
            <select
              aria-label={tr(lang, "profile")}
              value={plan.profile ?? ""}
              onChange={(e) => update((p) => ({ ...p, profile: e.target.value || null }))}
              className={select}
            >
              <option value="">{tr(lang, "chooseProfile")}</option>
              {profiles.map((g) => (
                <option key={g} value={g}>
                  {program.modules.find((m) => m.group.de === g)?.group[lang] || g}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1 text-sm">
            <button
              type="button"
              onClick={share}
              className="rounded-md px-2.5 py-1.5 text-neutral-300 hover:bg-neutral-900"
            >
              {tr(lang, "share")}
            </button>
            <button
              type="button"
              onClick={() =>
                window.confirm(tr(lang, "resetConfirm")) &&
                update(() => emptyPlan(program, plan.startYear, plan.startTerm))
              }
              className="rounded-md px-2.5 py-1.5 text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300"
            >
              {tr(lang, "reset")}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-md border border-neutral-800 px-2.5 py-1.5 text-xs text-neutral-300 hover:bg-neutral-900"
              aria-label={tr(lang, "theme")}
              title={tr(lang, "theme")}
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <button
              type="button"
              onClick={() => setLang(lang === "de" ? "en" : "de")}
              className="rounded-md border border-neutral-800 px-2.5 py-1.5 text-xs text-neutral-300 hover:bg-neutral-900"
              aria-label="Sprache / language"
            >
              {lang === "de" ? "EN" : "DE"}
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
            {rules?.notice && <p className="mb-3 text-xs text-amber-300/90">{rules.notice[lang]}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {plan.semesters.map((keys, i) => (
                <SemesterCard
                  key={i}
                  index={i}
                  label={semesterLabel(plan, i)}
                  lp={semesterLp(program, plan, i)}
                  emptyText={tr(lang, "dropHere")}
                  isEmpty={keys.length === 0}
                >
                  {keys.map((key) => {
                    const item = resolveItem(program, plan, key);
                    if (!item) return null;
                    const area = areaOf[key];
                    return (
                      <ModuleChip
                        key={key}
                        item={item}
                        lang={lang}
                        dragId={`plan:${key}`}
                        warning={warnByKey.get(key)}
                        badge={area ? rules?.areas.find((a) => a.id === area)?.short?.[lang] : undefined}
                        onOpen={() => setOpenKey(key)}
                        onRemove={() => update((p) => removeFromPlan(p, key))}
                      />
                    );
                  })}
                </SemesterCard>
              ))}
            </div>
            <div className="mt-3 flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => update((p) => ({ ...p, semesters: [...p.semesters, []] }))}
                className="rounded-md border border-dashed border-neutral-800 px-3 py-1.5 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
              >
                + {tr(lang, "addSemester")}
              </button>
              {plan.semesters.length > 1 && plan.semesters.at(-1)?.length === 0 && (
                <button
                  type="button"
                  onClick={() => update((p) => ({ ...p, semesters: p.semesters.slice(0, -1) }))}
                  className="rounded-md px-3 py-1.5 text-neutral-500 hover:text-neutral-300"
                >
                  {tr(lang, "removeSemester")}
                </button>
              )}
            </div>
            <footer className="mt-8 max-w-3xl text-xs leading-relaxed text-neutral-600">
              {tr(lang, "disclaimer", { date: program.scrapedAt })}{" "}
              <a
                href={program.ekvvUrl + "?m"}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                {tr(lang, "ekvv")}
              </a>
              {program.fsbUrl && (
                <>
                  {" · "}
                  <a
                    href={program.fsbUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    {tr(lang, "fsb")}
                  </a>
                </>
              )}
              {" · "}
              <a
                href="https://github.com/parimalgavali/bielefeld-studyplan"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                GitHub
              </a>
            </footer>
          </main>

          <aside className="flex min-h-[28rem] flex-col border-t border-neutral-900 p-4 lg:h-full lg:w-[24rem] lg:border-l lg:border-t-0">
            <div className="mb-3 flex gap-1 rounded-md bg-neutral-900 p-1 text-sm" role="tablist">
              {(["modules", "progress"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                  className={`flex-1 rounded px-3 py-1 ${tab === k ? "bg-neutral-800 text-neutral-50" : "text-neutral-400 hover:text-neutral-200"}`}
                >
                  {tr(lang, k)}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto lg:overflow-visible">
              {tab === "modules" ? (
                <Sidebar
                  program={program}
                  plan={plan}
                  lang={lang}
                  onOpen={setOpenKey}
                  onAddCustom={(name, lp) =>
                    update((p) => ({
                      ...p,
                      custom: [...p.custom, { id: Date.now().toString(36), name, lp }],
                    }))
                  }
                />
              ) : (
                <div className="h-full overflow-y-auto pr-1">
                  <ProgressPanel
                    program={program}
                    plan={plan}
                    rules={rules}
                    lang={lang}
                    onOpen={setOpenKey}
                  />
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragKey && resolveItem(program, plan, dragKey) ? (
          <div className="w-72 rotate-1 shadow-2xl shadow-black">
            <ModuleChip
              item={resolveItem(program, plan, dragKey)!}
              lang={lang}
              dragId="overlay"
              onOpen={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>

      {openItem && (
        <ModuleDialog
          key={openItem.key}
          item={openItem}
          plan={plan}
          lang={lang}
          plannedIndex={findModule(plan, openItem.key)}
          rules={rules}
          areaOptions={rules ? areaChoices(rules, openItem.code) : []}
          onClose={() => setOpenKey(null)}
          onAdd={(i) => update((p) => addToSemester(p, openItem.key, i))}
          onRemove={() => update((p) => removeFromPlan(p, openItem.key))}
          onArea={(area) =>
            update((p) => {
              const areaOverrides = { ...p.areaOverrides };
              if (area) areaOverrides[openItem.key] = area;
              else delete areaOverrides[openItem.key];
              return { ...p, areaOverrides };
            })
          }
          onDeleteCustom={
            openItem.key.startsWith(CUSTOM_PREFIX)
              ? () => {
                  const key = openItem.key;
                  setOpenKey(null);
                  update((p) => ({
                    ...removeFromPlan(p, key),
                    custom: p.custom.filter((c) => CUSTOM_PREFIX + c.id !== key),
                  }));
                }
              : undefined
          }
        />
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-neutral-100 px-3 py-1.5 text-sm text-neutral-900 shadow-lg">
          {toast}
        </div>
      )}
    </DndContext>
  );
}
