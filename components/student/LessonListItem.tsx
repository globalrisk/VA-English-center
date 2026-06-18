import { builtinGameLabel } from "@/lib/builtin-games";
import { lessonTypeLabel } from "@/lib/lesson-types";
import type { Lesson } from "@/types/course";
import Link from "next/link";

type Props = {
  courseId: string;
  lesson: Lesson;
  index: number;
};

function lessonBadgeLabel(lesson: Lesson): string {
  const lessonType = lesson.lesson_type ?? "content";
  if (lessonType !== "game") return lessonTypeLabel(lessonType);
  if (lesson.embed_url?.trim()) return "Quizlet";
  if (lesson.builtin_game) return builtinGameLabel(lesson.builtin_game);
  return "Flashcards";
}

export function LessonListItem({ courseId, lesson, index }: Props) {
  return (
    <Link
      href={`/student/course/${courseId}/lesson/${lesson.id}`}
      className="course-card lesson-list-card"
      data-color="blue"
    >
      <span className="badge badge-yellow">{lessonBadgeLabel(lesson)}</span>
      <h3>Lesson {index + 1}: {lesson.title}</h3>
      {lesson.content && (
        <p style={{ color: "var(--ink-light)", marginTop: "0.5rem" }}>
          {lesson.content.length > 120 ? `${lesson.content.slice(0, 120)}…` : lesson.content}
        </p>
      )}
      <span className="course-link" style={{ marginTop: "0.75rem", display: "inline-block" }}>
        Open lesson →
      </span>
    </Link>
  );
}
