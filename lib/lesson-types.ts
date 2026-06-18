export const LESSON_TYPES = [
  {
    value: "content",
    label: "Reading",
    description: "Text and images for students to read",
  },
  {
    value: "video",
    label: "Video",
    description: "Students watch a video lesson",
  },
  {
    value: "game",
    label: "Game",
    description: "Flashcards or Quizlet-style practice",
  },
] as const;

export type LessonType = (typeof LESSON_TYPES)[number]["value"];

export function lessonTypeLabel(value: LessonType | string): string {
  return LESSON_TYPES.find((t) => t.value === value)?.label ?? value;
}
