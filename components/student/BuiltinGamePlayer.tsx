"use client";

import { useTranslations } from "@/components/i18n/LanguageProvider";
import { builtinGameLabel } from "@/lib/builtin-games";
import { BlastGame } from "@/components/student/BlastGame";
import { FlashcardFlipGame } from "@/components/student/FlashcardFlipGame";
import { MatchPairsGame } from "@/components/student/MatchPairsGame";
import { QuizChoiceGame } from "@/components/student/QuizChoiceGame";
import type { BuiltinGame } from "@/lib/builtin-games";
import type { GameCard } from "@/types/course";

type Props = {
  builtinGame: BuiltinGame;
  cards: GameCard[];
  onComplete?: () => void | Promise<void>;
};

export function BuiltinGamePlayer({ builtinGame, cards, onComplete }: Props) {
  const t = useTranslations();
  const heading = t(builtinGameLabel(builtinGame));

  switch (builtinGame) {
    case "flashcards":
      return (
        <div>
          <h2 className="builtin-game-heading">{heading}</h2>
          <FlashcardFlipGame cards={cards} onComplete={onComplete} />
        </div>
      );
    case "quiz":
      return (
        <div>
          <h2 className="builtin-game-heading">{heading}</h2>
          <QuizChoiceGame cards={cards} onComplete={onComplete} />
        </div>
      );
    case "match":
      return (
        <div>
          <h2 className="builtin-game-heading">{heading}</h2>
          <MatchPairsGame cards={cards} onComplete={onComplete} />
        </div>
      );
    case "blast":
      return (
        <div>
          <h2 className="builtin-game-heading">{heading}</h2>
          <BlastGame cards={cards} onComplete={onComplete} />
        </div>
      );
    default:
      return (
        <div>
          <h2 className="builtin-game-heading">{heading}</h2>
          <FlashcardFlipGame cards={cards} onComplete={onComplete} />
        </div>
      );
  }
}
