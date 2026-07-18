"use client";

import { BuiltinGamePlayer } from "@/components/student/BuiltinGamePlayer";
import { ReadingTestPlayer } from "@/components/student/ReadingTestPlayer";
import { builtinGameLabel } from "@/lib/builtin-games";
import { lessonTypeLabel } from "@/lib/lesson-types";
import { countTestQuestions, normalizeTestContent } from "@/lib/test-content";
import type { Lesson } from "@/types/course";

type Props = {
  lesson: Lesson;
  index: number;
};

function gameActivityLabel(lesson: Lesson): string {
  if (lesson.builtin_game) return builtinGameLabel(lesson.builtin_game);
  return "Flashcards";
}

export function LessonPageContent({ lesson, index }: Props) {
  const lessonType = lesson.lesson_type ?? "game";
  const gameCards = lesson.game_cards ?? [];
  const builtinGame = lesson.builtin_game ?? "flashcards";
  const testContent = normalizeTestContent(lesson.test_content);
  const hasTestContent =
    Boolean(testContent.passageTitle.trim()) &&
    testContent.paragraphs.some((p) => p.text.trim()) &&
    countTestQuestions(testContent) > 0;

  const activityBadge =
    lessonType === "game" ? gameActivityLabel(lesson) : lessonTypeLabel(lessonType);

  return (
    <div className={`lesson-page ${lessonType === "test" ? "lesson-page-wide" : ""}`}>
      <div className="lesson-page-header">
        <span className="badge badge-yellow">{activityBadge}</span>
        <h1 className="section-title" style={{ marginTop: "0.75rem" }}>
          Lesson {index + 1}: {lesson.title}
        </h1>
        {lesson.content && (
          <p className="section-sub">{lesson.content}</p>
        )}
      </div>

      {lessonType === "game" && (
        <div className="lesson-page-body">
          <BuiltinGamePlayer builtinGame={builtinGame} cards={gameCards} />
        </div>
      )}

      {lessonType === "test" && (
        <div className="lesson-page-body">
          {hasTestContent ? (
            <ReadingTestPlayer content={testContent} />
          ) : (
            <p style={{ color: "var(--ink-light)", fontFamily: "var(--font-hand)" }}>
              This test is not ready yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
