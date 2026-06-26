"use client";

import type { GameCard } from "@/types/course";
import { canSpeak, speakEnglish, stopSpeaking } from "@/lib/speech";
import { useEffect, useMemo, useState } from "react";

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
  const speechSupported = canSpeak();

  const current = validCards[index];

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    if (!speechSupported || flipped || !current) return;
    speakEnglish(current.term);
  }, [index, flipped, current?.term, speechSupported]);

  if (validCards.length < 2) {
    return <p style={{ color: "var(--ink-light)" }}>Flashcards are not ready yet.</p>;
  }

  function goNext() {
    stopSpeaking();
    setFlipped(false);
    setIndex((i) => (i + 1) % validCards.length);
  }

  function goPrev() {
    stopSpeaking();
    setFlipped(false);
    setIndex((i) => (i - 1 + validCards.length) % validCards.length);
  }

  function handleFlip() {
    setFlipped((f) => {
      if (!f) stopSpeaking();
      return !f;
    });
  }

  function handleListen() {
    speakEnglish(current.term);
  }

  return (
    <div className="flashcard-game">
      <button
        type="button"
        className={`flashcard ${flipped ? "flipped" : ""}`}
        onClick={handleFlip}
        aria-label="Flip flashcard"
      >
        <span className="flashcard-face flashcard-front">{current.term}</span>
        <span className="flashcard-face flashcard-back">{current.definition}</span>
      </button>
      <div className="flashcard-toolbar">
        {speechSupported && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleListen}
            aria-label={`Listen to ${current.term}`}
          >
            Listen
          </button>
        )}
      </div>
      <p className="flashcard-hint">
        Tap the card to flip
        {speechSupported ? " · Tap Listen to hear the word" : ""}
        · {index + 1} / {validCards.length}
      </p>
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
