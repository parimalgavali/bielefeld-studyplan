"use client";

import { useDraggable } from "@dnd-kit/core";
import type { PlanItem } from "@/lib/plan";
import type { Lang } from "@/lib/types";

interface Props {
  item: PlanItem;
  lang: Lang;
  dragId: string;
  warning?: string;
  muted?: boolean;
  badge?: string;
  onOpen: () => void;
  onRemove?: () => void;
  /** Sidebar: show/hide the module's courses. */
  expanded?: boolean;
  onToggle?: () => void;
  /** Courses picked for this planned module. */
  courses?: { id: string; label: string; onRemove: () => void }[];
}

export default function ModuleChip(props: Props) {
  const { item, lang, dragId, warning, muted, badge, onOpen, onRemove, expanded, onToggle, courses } = props;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { key: item.key },
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`group cursor-grab touch-none rounded-lg border px-2.5 py-2 text-sm transition active:cursor-grabbing ${
        warning
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-neutral-800 bg-neutral-900 hover:border-neutral-700 hover:shadow-sm hover:shadow-black/5"
      } ${item.module?.binding === "Pflicht" ? "border-l-[3px] border-l-brand-500" : ""} ${isDragging ? "opacity-30" : ""} ${muted ? "opacity-50" : ""}`}
      title={warning}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpen}
          onPointerDown={(e) => e.stopPropagation()}
          className="min-w-0 flex-1 text-left"
        >
          <div className="truncate font-medium text-neutral-100">{item.name[lang] || item.name.de}</div>
          <div className="flex min-w-0 items-center gap-2 text-xs text-neutral-500">
            {item.code && <span className="shrink-0 font-mono">{item.code}</span>}
            {warning && <span className="min-w-0 truncate text-amber-400/90">{warning}</span>}
          </div>
        </button>
        {badge && (
          <span className="shrink-0 rounded-md bg-brand-500/10 px-1.5 py-0.5 text-[11px] font-medium text-brand-400">
            {badge}
          </span>
        )}
        <span className="shrink-0 text-xs font-semibold tabular-nums text-neutral-300">{item.lp} LP</span>
        {onRemove && (
          <button
            type="button"
            aria-label="Remove"
            onClick={onRemove}
            onPointerDown={(e) => e.stopPropagation()}
            className="shrink-0 text-neutral-600 opacity-0 transition-opacity hover:text-neutral-200 group-hover:opacity-100 focus:opacity-100"
          >
            ×
          </button>
        )}
        {onToggle && (
          <button
            type="button"
            aria-label={item.name[lang] || item.name.de}
            aria-expanded={expanded}
            onClick={onToggle}
            onPointerDown={(e) => e.stopPropagation()}
            className="shrink-0 px-0.5 text-neutral-500 hover:text-neutral-200"
          >
            {expanded ? "▾" : "▸"}
          </button>
        )}
      </div>
      {courses && courses.length > 0 && (
        <ul className="mt-1 flex flex-col gap-0.5 border-t border-neutral-800 pt-1">
          {courses.map((c) => (
            <li key={c.id} className="flex items-center gap-1.5 text-xs text-neutral-400">
              <span className="min-w-0 flex-1 truncate">{c.label}</span>
              <button
                type="button"
                aria-label="Remove course"
                onClick={c.onRemove}
                onPointerDown={(e) => e.stopPropagation()}
                className="shrink-0 text-neutral-600 hover:text-neutral-200"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
