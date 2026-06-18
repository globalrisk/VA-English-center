export const BUILTIN_GAMES = [
  {
    value: "flashcards",
    label: "Flashcards",
    description: "Flip cards to learn terms and definitions",
  },
  {
    value: "quiz",
    label: "Quick quiz",
    description: "Multiple-choice questions like Quizlet",
  },
  {
    value: "match",
    label: "Match pairs",
    description: "Match each term to its definition",
  },
] as const;

export type BuiltinGame = (typeof BUILTIN_GAMES)[number]["value"];

export function builtinGameLabel(value: BuiltinGame | string): string {
  return BUILTIN_GAMES.find((g) => g.value === value)?.label ?? value;
}
