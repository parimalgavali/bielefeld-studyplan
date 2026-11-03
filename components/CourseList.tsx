"use client";

import { useDraggable } from "@dnd-kit/core";
import { courseUrl, distinctCourses, termLabel } from "@/lib/courses";
import { tr } from "@/lib/i18n";
import type { Course, CourseGroup, Lang } from "@/lib/types";

interface Props {
  moduleKey: string;
  terms: [string, CourseGroup[]][];
  firstTerm: string | null;
  lang: Lang;
  /** Draggable rows (sidebar) or links only (dialog). */
  draggable?: boolean;
}

function Row({ course, parallel, lang }: { course: Course; parallel: number; lang: Lang }) {
  return (
    <>
      <span className="w-5 shrink-0 text-neutral-500">{course.type}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-neutral-200">{course.title}</span>
        <span className="block truncate text-neutral-500">
          {[course.lecturers, course.times].filter(Boolean).join(" · ")}
          {parallel > 0 && ` · ${tr(lang, "parallel", { n: parallel })}`}
        </span>
      </span>
    </>
  );
}

function DraggableRow({
  moduleKey,
  term,
  course,
  parallel,
  lang,
}: {
  moduleKey: string;
  term: string;
  course: Course;
  parallel: number;
  lang: Lang;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `course:${moduleKey}:${term}:${course.id}`,
    data: { key: moduleKey, course: { term, id: course.id } },
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-roledescription="draggable course"
      className={`flex cursor-grab touch-none items-start gap-2 rounded px-1.5 py-1 text-xs hover:bg-neutral-800/60 active:cursor-grabbing ${isDragging ? "opacity-30" : ""}`}
    >
      <Row course={course} parallel={parallel} lang={lang} />
    </div>
  );
}

export default function CourseList({ moduleKey, terms, firstTerm, lang, draggable }: Props) {
  if (!terms.length) {
    return (
      <p className="text-xs text-neutral-500">
        {tr(lang, "noCourses", { from: firstTerm ? termLabel(firstTerm) : "" })}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-neutral-500">{tr(lang, draggable ? "dragCourse" : "dialogCourses")}</p>
      {terms.map(([term, groups]) => (
        <div key={term}>
          <h4 className="mb-0.5 text-xs font-medium text-neutral-300">{termLabel(term)}</h4>
          {groups.map((g) => (
            <div key={g.element} className="mb-1">
              <div className="truncate px-1.5 text-[11px] uppercase tracking-wide text-neutral-600">
                {g.element}
              </div>
              {distinctCourses(g).map(({ course, parallel }) =>
                draggable ? (
                  <DraggableRow
                    key={course.id}
                    moduleKey={moduleKey}
                    term={term}
                    course={course}
                    parallel={parallel}
                    lang={lang}
                  />
                ) : (
                  <a
                    key={course.id}
                    href={courseUrl(course.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-2 rounded px-1.5 py-1 text-xs hover:bg-neutral-800/60"
                  >
                    <Row course={course} parallel={parallel} lang={lang} />
                  </a>
                ),
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
