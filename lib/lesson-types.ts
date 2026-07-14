export const LESSON_TYPES = [
  {
    value: "game",
    label: "Game",
    description: "Flashcards, quizzes, match, Blast, or Quizlet practice",
  },
  {
    value: "test",
    label: "Test",
    description: "Coming soon — assessment lesson",
  },
] as const;

export type LessonType = (typeof LESSON_TYPES)[number]["value"];

export function lessonTypeLabel(value: LessonType | string): string {
  return LESSON_TYPES.find((t) => t.value === value)?.label ?? value;
}
