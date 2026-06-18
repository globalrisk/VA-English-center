"use client";

import type { GameCard } from "@/types/course";
import { useMemo, useState } from "react";

type Props = {
  cards: GameCard[];
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function QuizChoiceGame({ cards }: Props) {
  const validCards = useMemo(
    () => cards.filter((c) => c.term.trim() && c.definition.trim()),
    [cards]
  );
  const quizCards = useMemo(() => shuffle(validCards), [validCards]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const currentQuiz = quizCards[quizIndex];
  const choices = useMemo(() => {
    if (!currentQuiz) return [];
    const others = validCards
      .filter((c) => c.definition !== currentQuiz.definition)
      .map((c) => c.definition);
    const picked = shuffle(others).slice(0, 3);
    return shuffle([currentQuiz.definition, ...picked]);
  }, [currentQuiz, validCards]);

  if (validCards.length < 2) {
    return <p style={{ color: "var(--ink-light)" }}>Quiz is not ready yet.</p>;
  }

  function pickChoice(definition: string) {
    if (!currentQuiz || answered) return;
    setSelected(definition);
    setAnswered(true);
    if (definition === currentQuiz.definition) setScore((s) => s + 1);
  }

  function nextQuiz() {
    if (quizIndex + 1 >= quizCards.length) return;
    setQuizIndex((i) => i + 1);
    setSelected(null);
    setAnswered(false);
  }

  return (
    <div className="flashcard-game">
      <p className="flashcard-quiz-prompt">
        What is <strong>{currentQuiz?.term}</strong>?
      </p>
      <div className="flashcard-quiz-choices">
        {choices.map((choice) => {
          const isCorrect = choice === currentQuiz?.definition;
          const isWrongPick = selected === choice && !isCorrect;
          return (
            <button
              key={choice}
              type="button"
              className={`flashcard-quiz-choice${selected === choice ? " selected" : ""}${answered && isCorrect ? " correct" : ""}${answered && isWrongPick ? " wrong" : ""}`}
              disabled={answered}
              onClick={() => pickChoice(choice)}
            >
              {choice}
            </button>
          );
        })}
      </div>
      <p className="flashcard-hint">
        Score: {score} / {quizCards.length}
        {answered && quizIndex + 1 < quizCards.length && (
          <button type="button" className="course-link" style={{ marginLeft: "0.75rem" }} onClick={nextQuiz}>
            Next question →
          </button>
        )}
        {answered && quizIndex + 1 >= quizCards.length && (
          <span style={{ marginLeft: "0.75rem" }}>Done!</span>
        )}
      </p>
    </div>
  );
}
