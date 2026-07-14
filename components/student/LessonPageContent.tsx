"use client";

import { BuiltinGamePlayer } from "@/components/student/BuiltinGamePlayer";
import { builtinGameLabel } from "@/lib/builtin-games";
import { lessonTypeLabel } from "@/lib/lesson-types";
import type { Lesson } from "@/types/course";

type Props = {
  lesson: Lesson;
  index: number;
};

function gameActivityLabel(lesson: Lesson): string {
  if (lesson.embed_url?.trim()) return "Quizlet";
  if (lesson.builtin_game) return builtinGameLabel(lesson.builtin_game);
  return "Flashcards";
}

export function LessonPageContent({ lesson, index }: Props) {
  const lessonType = lesson.lesson_type ?? "game";
  const gameCards = lesson.game_cards ?? [];
  const builtinGame = lesson.builtin_game ?? "flashcards";
  const activityBadge =
    lessonType === "game" ? gameActivityLabel(lesson) : lessonTypeLabel(lessonType);

  return (
    <div className="lesson-page">
      <div className="lesson-page-header">
        <span className="badge badge-yellow">{activityBadge}</span>
        <h1 className="section-title" style={{ marginTop: "0.75rem" }}>
          Lesson {index + 1}: {lesson.title}
        </h1>
        {lesson.content && lessonType === "game" && (
          <p className="section-sub">{lesson.content}</p>
        )}
      </div>

      {lessonType === "game" && (
        <div className="lesson-page-body">
          <BuiltinGamePlayer
            builtinGame={builtinGame}
            cards={gameCards}
            embedUrl={lesson.embed_url}
          />
        </div>
      )}

      {lessonType === "test" && (
        <div className="lesson-page-body">
          <p className="section-sub" style={{ marginBottom: "0.75rem" }}>
            {lesson.content?.trim() || "This test is not ready yet."}
          </p>
          <p style={{ color: "var(--ink-light)", fontFamily: "var(--font-hand)" }}>
            Test coming soon — check back later!
          </p>
        </div>
      )}
    </div>
  );
}
