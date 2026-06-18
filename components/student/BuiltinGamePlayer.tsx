"use client";

import { builtinGameLabel } from "@/lib/builtin-games";
import { FlashcardFlipGame } from "@/components/student/FlashcardFlipGame";
import { MatchPairsGame } from "@/components/student/MatchPairsGame";
import { QuizChoiceGame } from "@/components/student/QuizChoiceGame";
import type { BuiltinGame } from "@/lib/builtin-games";
import type { GameCard } from "@/types/course";

type Props = {
  builtinGame: BuiltinGame;
  cards: GameCard[];
  embedUrl?: string | null;
};

export function BuiltinGamePlayer({ builtinGame, cards, embedUrl }: Props) {
  if (embedUrl?.trim()) {
    return (
      <div>
        <h2 className="builtin-game-heading">Quizlet</h2>
        <div className="lesson-page-embed">
          <iframe src={embedUrl} title="Quizlet game" allowFullScreen />
        </div>
      </div>
    );
  }

  const heading = builtinGameLabel(builtinGame);

  switch (builtinGame) {
    case "flashcards":
      return (
        <div>
          <h2 className="builtin-game-heading">{heading}</h2>
          <FlashcardFlipGame cards={cards} />
        </div>
      );
    case "quiz":
      return (
        <div>
          <h2 className="builtin-game-heading">{heading}</h2>
          <QuizChoiceGame cards={cards} />
        </div>
      );
    case "match":
      return (
        <div>
          <h2 className="builtin-game-heading">{heading}</h2>
          <MatchPairsGame cards={cards} />
        </div>
      );
    default:
      return (
        <div>
          <h2 className="builtin-game-heading">{heading}</h2>
          <FlashcardFlipGame cards={cards} />
        </div>
      );
  }
}
