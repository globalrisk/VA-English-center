"use client";

import { useTranslations } from "@/components/i18n/LanguageProvider";


import type { GameCard } from "@/types/course";
import { canSpeak, speakEnglish, stopSpeaking } from "@/lib/speech";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  cards: GameCard[];
  onComplete?: () => void | Promise<void>;
};

export function FlashcardFlipGame({ cards, onComplete }: Props) {
  const t = useTranslations();
  const validCards = useMemo(
    () => cards.filter((c) => c.term.trim() && c.definition.trim()),
    [cards]
  );
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const viewedIndexesRef = useRef<Set<number>>(new Set([0]));
  const completionSentRef = useRef(false);
  const speechSupported = canSpeak();

  const current = validCards[index];

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    setIndex(0);
    setFlipped(false);
    viewedIndexesRef.current = new Set([0]);
    completionSentRef.current = false;
  }, [validCards]);

  useEffect(() => {
    viewedIndexesRef.current.add(index);
    if (
      validCards.length > 0 &&
      viewedIndexesRef.current.size >= validCards.length &&
      !completionSentRef.current
    ) {
      completionSentRef.current = true;
      void onComplete?.();
    }
  }, [index, onComplete, validCards.length]);

  useEffect(() => {
    if (!speechSupported || flipped || !current) return;
    speakEnglish(current.term);
  }, [index, flipped, current?.term, speechSupported]);

  if (validCards.length < 2) {
    return <p style={{ color: "var(--ink-light)" }}>{t("Flashcards are not ready yet.")}</p>;
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
        aria-label={t("Flip flashcard")}
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
            aria-label={t("Listen to {0}", { 0: current.term })}
          >
            {t("Listen")}</button>
        )}
      </div>
      <p className="flashcard-hint">
        {t("Tap the card to flip")}{speechSupported ? t(" · Tap Listen to hear the word") : ""}
        · {index + 1} / {validCards.length}
      </p>
      <div className="course-card-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={goPrev}>
          {t("← Previous")}</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={goNext}>
          {t("Next →")}</button>
      </div>
    </div>
  );
}
