"use client";

import { useTranslations } from "@/components/i18n/LanguageProvider";


import { builtinGameLabel } from "@/lib/builtin-games";
import { lessonTypeLabel } from "@/lib/lesson-types";
import type { Lesson } from "@/types/course";
import Link from "next/link";
import { useState } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Props = {
  courseId: string;
  lesson: Lesson;
  index: number;
  completed?: boolean;
};

function lessonBadgeLabel(lesson: Lesson): string {
  const lessonType = lesson.lesson_type ?? "game";
  if (lessonType === "test") return lessonTypeLabel("test");
  if (lesson.builtin_game) return builtinGameLabel(lesson.builtin_game);
  return "Game";
}

function OpenLessonLabel({ pending, completed }: { pending: boolean; completed: boolean }) {
  const t = useTranslations();
  if (pending) {
    return (
      <span
        className="course-link btn-loading"
        style={{ marginTop: "0.75rem", display: "inline-flex" }}
      >
        <LoadingSpinner size="sm" label={t("Opening lesson")} />
        {t("Opening lesson…")}</span>
    );
  }

  return (
    <span className="course-link" style={{ marginTop: "0.75rem", display: "inline-block" }}>
      {completed ? t("Review lesson →") : t("Open lesson →")}
    </span>
  );
}

export function LessonListItem({ courseId, lesson, index, completed = false }: Props) {
  const t = useTranslations();
  const [pending, setPending] = useState(false);
  const href = `/student/course/${courseId}/lesson/${lesson.id}`;

  return (
    <Link
      href={href}
      className={`course-card lesson-list-card${completed ? " is-complete" : ""}`}
      data-color="blue"
      onClick={() => setPending(true)}
    >
      <span className="badge badge-yellow">{t(lessonBadgeLabel(lesson))}</span>
      {completed ? <span className="lesson-complete-badge">{t("✓ Completed")}</span> : null}
      <h3>
        {t("Lesson ")}{index + 1}: {lesson.title}
      </h3>
      {lesson.content && (
        <p style={{ color: "var(--ink-light)", marginTop: "0.5rem" }}>
          {lesson.content.length > 120 ? `${lesson.content.slice(0, 120)}…` : lesson.content}
        </p>
      )}
      <OpenLessonLabel pending={pending} completed={completed} />
    </Link>
  );
}
