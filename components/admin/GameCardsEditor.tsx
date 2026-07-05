"use client";

import type { GameCard } from "@/types/course";

type Props = {
  cards: GameCard[];
  disabled?: boolean;
  minCards?: number;
  onChange: (cards: GameCard[]) => void;
};

const emptyCard = (): GameCard => ({ term: "", definition: "" });

export function GameCardsEditor({ cards, disabled, minCards = 2, onChange }: Props) {
  function updateCard(index: number, field: keyof GameCard, value: string) {
    onChange(cards.map((card, i) => (i === index ? { ...card, [field]: value } : card)));
  }

  function addCard() {
    onChange([...cards, emptyCard()]);
  }

  function removeCard(index: number) {
    if (cards.length <= minCards) return;
    onChange(cards.filter((_, i) => i !== index));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {cards.map((card, index) => (
        <div
          key={index}
          style={{
            padding: "0.75rem",
            border: "2px dashed var(--paper-dark)",
            borderRadius: "12px",
          }}
        >
          <div className="form-group" style={{ marginBottom: "0.5rem" }}>
            <label htmlFor={`card-term-${index}`}>Term</label>
            <input
              id={`card-term-${index}`}
              type="text"
              value={card.term}
              disabled={disabled}
              placeholder="e.g. Apple"
              onChange={(e) => updateCard(index, "term", e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: "0.5rem" }}>
            <label htmlFor={`card-def-${index}`}>Definition</label>
            <input
              id={`card-def-${index}`}
              type="text"
              value={card.definition}
              disabled={disabled}
              placeholder="e.g. A red fruit"
              onChange={(e) => updateCard(index, "definition", e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={disabled || cards.length <= minCards}
            onClick={() => removeCard(index)}
          >
            Remove card
          </button>
        </div>
      ))}
      <p className="age-group-picker-hint">
        At least {minCards} flashcards with term and definition required for the selected game.
      </p>
      <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={addCard}>
        + Add flashcard
      </button>
    </div>
  );
}
