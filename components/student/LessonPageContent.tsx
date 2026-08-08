"use client";

import { BuiltinGamePlayer } from "@/components/student/BuiltinGamePlayer";
import { TestLessonEditor } from "@/components/student/TestLessonEditor";
import { builtinGameLabel } from "@/lib/builtin-games";
import { lessonTypeLabel } from "@/lib/lesson-types";
import type { Lesson, TestAttempt } from "@/types/course";

type Props = {
  lesson: Lesson;
  index: number;
  isAdmin?: boolean;
  testAttempt?: TestAttempt | null;
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
}: Props) {
  const lessonType = lesson.lesson_type ?? "game";
  const gameCards = lesson.game_cards ?? [];
  const builtinGame = lesson.builtin_game ?? "flashcards";

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
          <TestLessonEditor
            lesson={lesson}
            isAdmin={isAdmin}
            initialAttempt={testAttempt}
          />
        </div>
      )}
    </div>
  );
}
