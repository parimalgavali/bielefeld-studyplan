"use client";

import { useDroppable } from "@dnd-kit/core";
import { useMemo, useState } from "react";
import { tr } from "@/lib/i18n";
import { CUSTOM_PREFIX, findModule, inactiveGroups, resolveItem, type Plan } from "@/lib/plan";
import type { Lang, Program } from "@/lib/types";
import ModuleChip from "./ModuleChip";

interface Props {
  program: Program;
  plan: Plan;
  lang: Lang;
  onOpen: (key: string) => void;
  onAddCustom: (name: string, lp: number) => void;
}

type Filter = "all" | "Pflicht" | "Wahlpflicht";

export default function Sidebar({ program, plan, lang, onOpen, onAddCustom }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [group, setGroup] = useState("");
  const [customName, setCustomName] = useState("");
  const [customLp, setCustomLp] = useState(5);
  const { setNodeRef, isOver } = useDroppable({ id: "sidebar" });

  const groups = useMemo(() => [...new Set(program.modules.map((m) => m.group.de))], [program]);
  const inactive = inactiveGroups(program, plan.profile);
  const q = query.trim().toLowerCase();
  const modules = program.modules.filter(
    (m) =>
      !inactive.has(m.group.de) &&
      (filter === "all" || m.binding === filter) &&
      (!group || m.group.de === group) &&
      (!q ||
        m.code.toLowerCase().includes(q) ||
        m.name.de.toLowerCase().includes(q) ||
        m.name.en.toLowerCase().includes(q)),
  );
  const seen = new Set<string>();

  const chip = "rounded-md px-2.5 py-1 text-xs transition-colors";
  return (
    <div
      ref={setNodeRef}
      className={`flex h-full min-h-0 flex-col gap-3 ${isOver ? "rounded-lg bg-neutral-900/60" : ""}`}
    >
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={tr(lang, "search")}
        className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none placeholder:text-neutral-600 focus:border-neutral-600"
      />
      <div className="flex flex-wrap items-center gap-1.5">
        {(["all", "Pflicht", "Wahlpflicht"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`${chip} ${filter === f ? "bg-neutral-100 text-neutral-900" : "bg-neutral-900 text-neutral-400 hover:text-neutral-200"}`}
          >
            {f === "all" ? tr(lang, "all") : f === "Pflicht" ? tr(lang, "pflicht") : tr(lang, "wahlpflicht")}
          </button>
        ))}
        {groups.length > 1 && (
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            aria-label={tr(lang, "allGroups")}
            className="ml-auto max-w-44 truncate rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-300"
          >
            <option value="">{tr(lang, "allGroups")}</option>
            {groups
              .filter((g) => !inactive.has(g))
              .map((g) => {
                const label = program.modules.find((m) => m.group.de === g)?.group[lang] || g;
                return (
                  <option key={g} value={g}>
                    {label || tr(lang, "noGroup")}
                  </option>
                );
              })}
          </select>
        )}
      </div>

      <div className="-mr-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-2">
        {modules.map((m) => {
          if (seen.has(m.code)) return null;
          seen.add(m.code);
          const item = resolveItem(program, plan, m.code)!;
          const at = findModule(plan, m.code);
          return (
            <ModuleChip
              key={m.code}
              item={item}
              lang={lang}
              dragId={`side:${m.code}`}
              muted={at >= 0}
              badge={at >= 0 ? `S${at + 1}` : undefined}
              onOpen={() => onOpen(m.code)}
            />
          );
        })}

        <div className="mt-3 border-t border-neutral-800 pt-3">
          <h3 className="mb-1 text-xs uppercase tracking-wide text-neutral-500">{tr(lang, "customTitle")}</h3>
          <p className="mb-2 text-xs text-neutral-500">{tr(lang, "customHint")}</p>
          <form
            className="flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!customName.trim()) return;
              onAddCustom(customName.trim(), customLp);
              setCustomName("");
            }}
          >
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={tr(lang, "customName")}
              aria-label={tr(lang, "customName")}
              className="min-w-0 flex-1 rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm outline-none focus:border-neutral-600"
            />
            <input
              type="number"
              min={1}
              max={60}
              value={customLp}
              onChange={(e) => setCustomLp(Number(e.target.value))}
              aria-label="LP"
              className="w-16 rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-neutral-100 px-3 text-sm text-neutral-900 hover:bg-white"
            >
              {tr(lang, "add")}
            </button>
          </form>
          <div className="mt-2 flex flex-col gap-1.5">
            {plan.custom.map((c) => {
              const key = CUSTOM_PREFIX + c.id;
              const at = findModule(plan, key);
              return (
                <ModuleChip
                  key={key}
                  item={resolveItem(program, plan, key)!}
                  lang={lang}
                  dragId={`side:${key}`}
                  muted={at >= 0}
                  badge={at >= 0 ? `S${at + 1}` : undefined}
                  onOpen={() => onOpen(key)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
