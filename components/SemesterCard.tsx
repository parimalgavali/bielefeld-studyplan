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

export default function SemesterCard({ index, label, lp, emptyText, children, isEmpty }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `semester-${index}` });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${index + 1}. ${label}`}
      className={`flex min-h-40 flex-col rounded-lg border p-3 transition-colors ${
        isOver ? "border-neutral-500 bg-neutral-900" : "border-neutral-800 bg-neutral-950"
      }`}
    >
      <header className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-neutral-200">
          {index + 1}. <span className="text-neutral-400">{label}</span>
        </h3>
        <span className={`text-xs tabular-nums ${lp > 35 ? "text-amber-400" : "text-neutral-500"}`}>
          {lp} LP
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-1.5">
        {children}
        {isEmpty && (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-neutral-800 text-xs text-neutral-600">
            {emptyText}
          </div>
        )}
      </div>
    </section>
  );
}
