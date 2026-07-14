"use client";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { unitKindLabel } from "@/lib/units";
import type { Unit } from "@/types/course";
import Link from "next/link";
import { useState } from "react";

type Props = {
  courseId: string;
  unit: Unit;
  lessonCount: number;
};

function UnitIcon({ kind }: { kind: Unit["kind"] }) {
  if (kind === "vocabulary") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M14 14h27a9 9 0 0 1 9 9v27H23a9 9 0 0 1-9-9V14Z" />
        <path d="M23 14v36M30 25h12M30 33h12" />
        <path d="m47 9 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" className="unit-icon-accent" />
      </svg>
    );
  }

  if (kind === "reading") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M8 16c9-2 17 0 24 6v31c-7-6-15-8-24-6V16Z" />
        <path d="M56 16c-9-2-17 0-24 6v31c7-6 15-8 24-6V16Z" />
        <path d="M15 26c4 0 8 1 11 3M15 34c4 0 8 1 11 3M49 26c-4 0-8 1-11 3M49 34c-4 0-8 1-11 3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M27 18 17 30H9v14h8l10 10V18Z" />
      <path d="M37 25c5 4 5 10 0 14M44 18c10 8 10 20 0 28" />
      <path d="m51 8 1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5L51 8Z" className="unit-icon-accent" />
    </svg>
  );
}

export function UnitListItem({ courseId, unit, lessonCount }: Props) {
  const [pending, setPending] = useState(false);
  const href = `/student/course/${courseId}/unit/${unit.id}`;
  const label = unitKindLabel(unit.kind);

  return (
    <Link
      href={href}
      className="unit-card"
      data-unit={unit.kind}
      onClick={() => setPending(true)}
      aria-label={`Open ${label} unit, ${lessonCount} ${lessonCount === 1 ? "lesson" : "lessons"}`}
    >
      <div className="unit-card-top">
        <span className="unit-card-number">Unit</span>
      </div>

      <div className="unit-card-icon">
        <UnitIcon kind={unit.kind} />
      </div>

      <div className="unit-card-copy">
        <h2>{label}</h2>
        <p>
          {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
        </p>
      </div>

      <span className={`unit-card-action${pending ? " btn-loading" : ""}`}>
        {pending ? (
          <>
            <LoadingSpinner size="sm" label="Opening unit" />
            Opening…
          </>
        ) : (
          <>
            Open <span aria-hidden="true">→</span>
          </>
        )}
      </span>
    </Link>
  );
}
