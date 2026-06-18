"use client";

import type { GameCard } from "@/types/course";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  cards: GameCard[];
};

type Tile = {
  id: string;
  cardIndex: number;
  side: "term" | "definition";
  text: string;
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildTiles(validCards: GameCard[]): Tile[] {
  const tiles: Tile[] = [];
  validCards.forEach((card, index) => {
    tiles.push({
      id: `${index}-term`,
      cardIndex: index,
      side: "term",
      text: card.term,
    });
    tiles.push({
      id: `${index}-def`,
      cardIndex: index,
      side: "definition",
      text: card.definition,
    });
  });
  return shuffle(tiles);
}

export function MatchPairsGame({ cards }: Props) {
  const validCards = useMemo(
    () => cards.filter((c) => c.term.trim() && c.definition.trim()),
    [cards]
  );

  const [tiles, setTiles] = useState<Tile[]>([]);
  const [matchedCardIndexes, setMatchedCardIndexes] = useState<Set<number>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wrongIds, setWrongIds] = useState<[string, string] | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    setTiles(buildTiles(validCards));
    setMatchedCardIndexes(new Set());
    setSelectedId(null);
    setWrongIds(null);
    setElapsedMs(0);
    setRunning(false);
    setFinished(false);
    startTimeRef.current = null;
  }, [validCards]);

  useEffect(() => {
    if (!running || finished) return;

    const tick = () => {
      if (startTimeRef.current !== null) {
        setElapsedMs(Date.now() - startTimeRef.current);
      }
    };

    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [running, finished]);

  if (validCards.length < 2) {
    return <p style={{ color: "var(--ink-light)" }}>Match game is not ready yet.</p>;
  }

  const visibleTiles = tiles.filter((tile) => !matchedCardIndexes.has(tile.cardIndex));
  const allMatched = matchedCardIndexes.size === validCards.length;

  function startTimer() {
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
      setRunning(true);
    }
  }

  function resetGame() {
    setTiles(buildTiles(validCards));
    setMatchedCardIndexes(new Set());
    setSelectedId(null);
    setWrongIds(null);
    setElapsedMs(0);
    setRunning(false);
    setFinished(false);
    startTimeRef.current = null;
  }

  function handleTileClick(tile: Tile) {
    if (finished || matchedCardIndexes.has(tile.cardIndex)) return;

    startTimer();

    if (wrongIds) return;

    if (selectedId === null) {
      setSelectedId(tile.id);
      return;
    }

    if (selectedId === tile.id) {
      setSelectedId(null);
      return;
    }

    const firstTile = tiles.find((t) => t.id === selectedId);
    if (!firstTile) {
      setSelectedId(tile.id);
      return;
    }

    if (firstTile.cardIndex === tile.cardIndex && firstTile.side !== tile.side) {
      const nextMatched = new Set(matchedCardIndexes).add(tile.cardIndex);
      setMatchedCardIndexes(nextMatched);
      setSelectedId(null);

      if (nextMatched.size === validCards.length) {
        setFinished(true);
        setRunning(false);
      }
      return;
    }

    setWrongIds([selectedId, tile.id]);
    setSelectedId(null);
    window.setTimeout(() => setWrongIds(null), 650);
  }

  const timerLabel = (elapsedMs / 1000).toFixed(1);

  return (
    <div className="match-game">
      <div className="match-game-header">
        <span className="match-game-timer">{timerLabel}s</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={resetGame}>
          Restart
        </button>
      </div>

      {finished && (
        <p className="match-game-done">
          Nice work! You cleared the board in <strong>{timerLabel}</strong> seconds.
        </p>
      )}

      {!finished && (
        <p className="flashcard-hint">Tap two cards that belong together.</p>
      )}

      <div className="match-game-grid">
        {visibleTiles.map((tile) => {
          const isSelected = selectedId === tile.id;
          const isWrong = wrongIds?.includes(tile.id);

          return (
            <button
              key={tile.id}
              type="button"
              data-side={tile.side}
              className={`match-game-card${isSelected ? " selected" : ""}${isWrong ? " wrong" : ""}`}
              onClick={() => handleTileClick(tile)}
            >
              <span className="match-game-card-text">{tile.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
