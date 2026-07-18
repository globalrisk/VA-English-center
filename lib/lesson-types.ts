export const LESSON_TYPES = [
  {
    value: "game",
    label: "Game",
    description: "Flashcards, quizzes, match, or Blast practice",
  },
  {
    value: "test",
    label: "Test",
    description: "Reading passage with multiple-choice questions",
  },
] as const;

export type LessonType = (typeof LESSON_TYPES)[number]["value"];

export function lessonTypeLabel(value: LessonType | string): string {
  return LESSON_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function lessonTypesForUnit(unitKind: string) {
  if (unitKind === "reading" || unitKind === "listening") {
    return LESSON_TYPES.map((type) =>
      type.value === "game"
        ? { ...type, description: "Flashcards practice" }
        : type
    );
  }

  return LESSON_TYPES;
}
