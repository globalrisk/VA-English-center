"use client";

import { BuiltinGamePlayer } from "@/components/student/BuiltinGamePlayer";
import { builtinGameLabel } from "@/lib/builtin-games";
import { lessonTypeLabel } from "@/lib/lesson-types";
import { getVideoEmbedUrl } from "@/lib/video";
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
  const lessonType = lesson.lesson_type ?? "content";
  const gameCards = lesson.game_cards ?? [];
  const embedUrl = lesson.video_url ? getVideoEmbedUrl(lesson.video_url) : null;
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
        {lesson.content && lessonType !== "content" && (
          <p className="section-sub">{lesson.content}</p>
        )}
      </div>

      {lessonType === "content" && (
        <div className="lesson-page-body">
          {lesson.content && <p className="lesson-page-text">{lesson.content}</p>}
          {lesson.image_url && (
            <img
              src={lesson.image_url}
              alt={lesson.title}
              className="lesson-page-image"
            />
          )}
        </div>
      )}

      {lessonType === "video" && lesson.video_url && (
        <div className="lesson-page-media">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={lesson.title}
              className="lesson-page-video-iframe"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={lesson.video_url} controls className="lesson-page-video-native" />
          )}
        </div>
      )}

      {lessonType === "game" && (
        <div className="lesson-page-body">
          <BuiltinGamePlayer
            builtinGame={builtinGame}
            cards={gameCards}
            embedUrl={lesson.embed_url}
          />
        </div>
      )}
    </div>
  );
}
