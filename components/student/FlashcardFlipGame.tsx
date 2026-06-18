"use client";

import type { GameCard } from "@/types/course";
import { useMemo, useState } from "react";

type Props = {
  cards: GameCard[];
};

export function FlashcardFlipGame({ cards }: Props) {
  const validCards = useMemo(
    () => cards.filter((c) => c.term.trim() && c.definition.trim()),
    [cards]
  );
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (validCards.length < 2) {
    return <p style={{ color: "var(--ink-light)" }}>Flashcards are not ready yet.</p>;
  }

  const current = validCards[index];

  function goNext() {
    setFlipped(false);
    setIndex((i) => (i + 1) % validCards.length);
  }

  function goPrev() {
    setFlipped(false);
    setIndex((i) => (i - 1 + validCards.length) % validCards.length);
  }

  return (
    <div className="flashcard-game">
      <button
        type="button"
        className={`flashcard ${flipped ? "flipped" : ""}`}
        onClick={() => setFlipped((f) => !f)}
        aria-label="Flip flashcard"
      >
        <span className="flashcard-face flashcard-front">{current.term}</span>
        <span className="flashcard-face flashcard-back">{current.definition}</span>
      </button>
      <p className="flashcard-hint">Tap the card to flip · {index + 1} / {validCards.length}</p>
      <div className="course-card-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={goPrev}>
          ← Previous
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={goNext}>
          Next →
        </button>
      </div>
    </div>
  );
}
