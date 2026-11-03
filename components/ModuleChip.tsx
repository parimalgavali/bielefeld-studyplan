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
}

export default function ModuleChip({ item, lang, dragId, warning, muted, badge, onOpen, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { key: item.key },
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`group flex cursor-grab touch-none items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors active:cursor-grabbing ${
        warning
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"
      } ${isDragging ? "opacity-30" : ""} ${muted ? "opacity-50" : ""}`}
      title={warning}
    >
      <button
        type="button"
        onClick={onOpen}
        onPointerDown={(e) => e.stopPropagation()}
        className="min-w-0 flex-1 text-left"
      >
        <div className="truncate text-neutral-100">{item.name[lang] || item.name.de}</div>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          {item.code && <span className="font-mono">{item.code}</span>}
          {item.module?.binding === "Pflicht" && <span className="text-sky-400/80">●</span>}
          {warning && <span className="truncate text-amber-400/90">{warning}</span>}
        </div>
      </button>
      {badge && <span className="rounded bg-neutral-800 px-1.5 text-xs text-neutral-400">{badge}</span>}
      <span className="shrink-0 tabular-nums text-xs text-neutral-400">{item.lp} LP</span>
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
    </div>
  );
}
