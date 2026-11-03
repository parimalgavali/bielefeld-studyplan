"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

interface Props {
  index: number;
  label: string;
  lp: number;
  emptyText: string;
  children: ReactNode;
  isEmpty: boolean;
}

const TYPICAL_LP = 30;

export default function SemesterCard({ index, label, lp, emptyText, children, isEmpty }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `semester-${index}` });
  const heavy = lp > 35;
  return (
    <section
      ref={setNodeRef}
      aria-label={`${index + 1}. ${label}`}
      className={`flex min-h-44 flex-col rounded-xl border bg-neutral-950 p-3.5 shadow-sm shadow-black/5 transition ${
        isOver ? "border-brand-500 ring-4 ring-brand-500/15" : "border-neutral-800"
      }`}
    >
      <header className="mb-3 flex items-center gap-2">
        <span className="grid size-6 place-items-center rounded-md bg-neutral-900 text-xs font-semibold tabular-nums text-neutral-200">
          {index + 1}
        </span>
        <h3 className="text-sm font-semibold tracking-tight text-neutral-100">{label}</h3>
        <span className="ml-auto flex items-center gap-2">
          <span className="h-1 w-12 overflow-hidden rounded-full bg-neutral-800">
            <span
              className={`block h-full rounded-full ${heavy ? "bg-amber-400" : "bg-brand-500"}`}
              style={{ width: `${Math.min(100, (lp / TYPICAL_LP) * 100)}%` }}
            />
          </span>
          <span
            className={`text-xs font-medium tabular-nums ${heavy ? "text-amber-400" : "text-neutral-400"}`}
          >
            {lp} LP
          </span>
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-1.5">
        {children}
        {isEmpty && (
          <div
            className={`flex flex-1 items-center justify-center rounded-lg border border-dashed text-xs transition-colors ${
              isOver ? "border-brand-500 text-brand-400" : "border-neutral-800 text-neutral-500"
            }`}
          >
            {emptyText}
          </div>
        )}
      </div>
    </section>
  );
}
