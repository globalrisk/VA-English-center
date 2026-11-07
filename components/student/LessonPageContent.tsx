"use client";

import { useTranslations } from "@/components/i18n/LanguageProvider";


import { BuiltinGamePlayer } from "@/components/student/BuiltinGamePlayer";
import { TestLessonEditor } from "@/components/student/TestLessonEditor";
import { builtinGameLabel } from "@/lib/builtin-games";
import { markLessonComplete } from "@/lib/lesson-progress-client";
import { lessonTypeLabel } from "@/lib/lesson-types";
import type { Lesson, LessonCompletion, TestAttempt } from "@/types/course";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

type Props = {
  lesson: Lesson;
  index: number;
  isAdmin?: boolean;
  testAttempt?: TestAttempt | null;
  initialCompletion?: LessonCompletion | null;
};

function gameActivityLabel(lesson: Lesson): string {
  if (lesson.builtin_game) return builtinGameLabel(lesson.builtin_game);
  return "Flashcards";
}

export function LessonPageContent({
  lesson,
  index,
  isAdmin = false,
  testAttempt = null,
  initialCompletion = null,
}: Props) {
  const t = useTranslations();
  const router = useRouter();
  const lessonType = lesson.lesson_type ?? "game";
  const gameCards = lesson.game_cards ?? [];
  const builtinGame = lesson.builtin_game ?? "flashcards";
  const [completedAt, setCompletedAt] = useState(initialCompletion?.completed_at ?? null);
  const [completionSaving, setCompletionSaving] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const completionRequestRef = useRef(false);

  const activityBadge =
    lessonType === "game" ? gameActivityLabel(lesson) : lessonTypeLabel(lessonType);

  const completeLesson = useCallback(async () => {
    if (isAdmin || completedAt || completionRequestRef.current) return;

    completionRequestRef.current = true;
    setCompletionSaving(true);
    setCompletionError(null);

    try {
      const completion = await markLessonComplete(lesson.id);
      setCompletedAt(completion.completed_at);
      router.refresh();
    } catch (error) {
      setCompletionError(error instanceof Error ? error.message : "Could not save lesson progress.");
      completionRequestRef.current = false;
    } finally {
      setCompletionSaving(false);
    }
  }, [completedAt, isAdmin, lesson.id, router]);

  return (
    <div className={`lesson-page ${lessonType === "test" ? "lesson-page-wide" : ""}`}>
      <div className="lesson-page-header">
        <span className="badge badge-yellow">{t(activityBadge)}</span>
        <h1 className="section-title" style={{ marginTop: "0.75rem" }}>
          {t("Lesson ")}{index + 1}: {lesson.title}
        </h1>
        {lesson.content && (
          <p className="section-sub">{lesson.content}</p>
        )}
      </div>

      {!isAdmin ? (
        <div className={`lesson-completion-status${completedAt ? " is-complete" : ""}`} aria-live="polite">
          {completedAt ? (
            <>
              <strong>{t("✓ Lesson completed")}</strong>
              <span>{t("Your course progress has been updated.")}</span>
            </>
          ) : completionSaving ? (
            <>
              <strong>{t("Saving progress…")}</strong>
              <span>{t("Please keep this page open for a moment.")}</span>
            </>
          ) : (
            <>
              <strong>{t("In progress")}</strong>
              <span>
                {lessonType === "test"
                  ? t("Submit your test to complete this lesson.")
                  : t("Finish this activity to complete the lesson automatically.")}
              </span>
            </>
          )}
          {completionError ? (
            <span className="lesson-completion-error">
              {t(completionError)}{" "}
              <button type="button" className="course-link" onClick={() => void completeLesson()}>
                {t("Retry saving")}</button>
            </span>
          ) : null}
        </div>
      ) : null}

      {lessonType === "game" && (
        <div className="lesson-page-body">
          <BuiltinGamePlayer builtinGame={builtinGame} cards={gameCards} onComplete={completeLesson} />
        </div>
      )}

      {lessonType === "test" && (
        <div className="lesson-page-body">
          <TestLessonEditor
            lesson={lesson}
            isAdmin={isAdmin}
            initialAttempt={testAttempt}
            onComplete={completeLesson}
          />
        </div>
      )}
    </div>
  );
}
