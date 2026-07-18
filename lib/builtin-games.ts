export const BUILTIN_GAMES = [
  {
    value: "flashcards",
    label: "Flashcards",
    description: "Flip cards to learn terms and definitions",
    minCards: 2,
  },
  {
    value: "quiz",
    label: "Quick quiz",
    description: "Multiple-choice questions",
    minCards: 2,
  },
  {
    value: "match",
    label: "Match pairs",
    description: "Match each term to its definition",
    minCards: 2,
  },
  {
    value: "blast",
    label: "Blast",
    description: "Blast the correct term before time runs out",
    minCards: 4,
  },
] as const;

export type BuiltinGame = (typeof BUILTIN_GAMES)[number]["value"];

const DEFAULT_MIN_CARDS = 2;

export function builtinGamesForUnit(unitKind: string) {
  if (unitKind === "reading" || unitKind === "listening") {
    return BUILTIN_GAMES.filter((game) => game.value === "flashcards");
  }
  return BUILTIN_GAMES;
}

export function isBuiltinGameAllowedInUnit(unitKind: string, game: BuiltinGame | string): boolean {
  if (unitKind === "reading" || unitKind === "listening") {
    return game === "flashcards";
  }
  return true;
}

export function normalizeBuiltinGameForUnit(
  unitKind: string | null,
  game: BuiltinGame | null | undefined
): BuiltinGame {
  const resolved = game ?? "flashcards";
  if (unitKind === "reading" || unitKind === "listening") {
    return "flashcards";
  }
  return resolved;
}

export function builtinGameLabel(value: BuiltinGame | string): string {
  return BUILTIN_GAMES.find((g) => g.value === value)?.label ?? value;
}

export function minCardsForBuiltinGame(value: BuiltinGame | string): number {
  return BUILTIN_GAMES.find((g) => g.value === value)?.minCards ?? DEFAULT_MIN_CARDS;
}
