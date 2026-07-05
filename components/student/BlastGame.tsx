"use client";

import { minCardsForBuiltinGame } from "@/lib/builtin-games";
import type { GameCard } from "@/types/course";
import { speakEnglish } from "@/lib/speech";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  cards: GameCard[];
};

type Balloon = {
  id: string;
  text: string;
  isCorrect: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  popping: boolean;
};

type NeckStrike = {
  originX: number;
  originY: number;
  angle: number;
  length: number;
  targetLength: number;
  phase: "extending" | "retracting";
};

const MIN_CARDS = minCardsForBuiltinGame("blast");
const ROUND_SECONDS = 60;
const BALLOON_SIZE = 88;
const BALLOON_R = BALLOON_SIZE / 2;
const HEAD_R = 28;
const NECK_SPEED = 14;
const SHOOTER_ZONE = 88;
const HEAD_IMAGE = "/images/skibidi-head.png";
const TOILET_IMAGE = "/images/skibidi-toilet-base.png";
const RAY_HIT_THRESHOLD = 40;
const BALLOON_COLORS = ["var(--yellow)", "var(--blue)", "var(--pink)", "var(--green)", "var(--purple)"];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomVelocity(): { vx: number; vy: number } {
  const speed = 0.6 + Math.random() * 0.5;
  const angle = Math.random() * Math.PI * 2;
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

function balloonCenter(balloon: Balloon): { cx: number; cy: number } {
  return { cx: balloon.x + BALLOON_R, cy: balloon.y + BALLOON_R };
}

function circlesOverlap(
  px: number,
  py: number,
  pr: number,
  bx: number,
  by: number,
  br: number
): boolean {
  const dx = px - bx;
  const dy = py - by;
  return dx * dx + dy * dy <= (pr + br) ** 2;
}

function neckHeadPosition(strike: NeckStrike): { x: number; y: number } {
  return {
    x: strike.originX + Math.cos(strike.angle) * strike.length,
    y: strike.originY + Math.sin(strike.angle) * strike.length,
  };
}

// The neck column points up by default; rotating by angle + 90deg aims it
// along the strike direction (screen coords, y down).
function neckRotateDeg(angle: number): number {
  return (angle * 180) / Math.PI + 90;
}

function findBalloonAtHead(
  headX: number,
  headY: number,
  balloons: Balloon[]
): Balloon | null {
  for (const balloon of balloons) {
    if (balloon.popping) continue;
    const { cx, cy } = balloonCenter(balloon);
    if (circlesOverlap(headX, headY, HEAD_R, cx, cy, BALLOON_R)) {
      return balloon;
    }
  }
  return null;
}

export function BlastGame({ cards }: Props) {
  const validCards = useMemo(
    () => cards.filter((c) => c.term.trim() && c.definition.trim()),
    [cards]
  );

  const arenaRef = useRef<HTMLDivElement>(null);
  const neckOriginRef = useRef<HTMLDivElement>(null);
  const roundRef = useRef(0);
  const balloonsRef = useRef<Balloon[]>([]);
  const neckStrikeRef = useRef<NeckStrike | null>(null);
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const [phase, setPhase] = useState<"idle" | "playing" | "finished">("idle");
  const [prompt, setPrompt] = useState("");
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [neckStrike, setNeckStrike] = useState<NeckStrike | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [shooterImgOk, setShooterImgOk] = useState(true);

  useEffect(() => {
    balloonsRef.current = balloons;
  }, [balloons]);

  useEffect(() => {
    neckStrikeRef.current = neckStrike;
  }, [neckStrike]);

  const spawnRound = useCallback(() => {
    if (validCards.length < MIN_CARDS) return;

    const correct = validCards[Math.floor(Math.random() * validCards.length)];
    const others = validCards.filter((c) => c !== correct);
    const distractorCount = Math.min(5, others.length);
    const distractors = shuffle(others).slice(0, distractorCount);
    const roundCards = shuffle([correct, ...distractors]);

    const arena = arenaRef.current;
    const width = arena?.clientWidth ?? 480;
    const height = arena?.clientHeight ?? 320;
    const pad = 8;
    const maxX = Math.max(pad, width - BALLOON_SIZE - pad);
    const maxY = Math.max(pad, height - BALLOON_SIZE - pad - SHOOTER_ZONE);

    roundRef.current += 1;
    const roundId = roundRef.current;

    const nextBalloons: Balloon[] = roundCards.map((card, index) => {
      const vel = reducedMotion ? { vx: 0, vy: 0 } : randomVelocity();
      return {
        id: `${roundId}-${index}`,
        text: card.term,
        isCorrect: card === correct,
        x: pad + Math.random() * (maxX - pad),
        y: pad + Math.random() * (maxY - pad),
        vx: vel.vx,
        vy: vel.vy,
        color: BALLOON_COLORS[index % BALLOON_COLORS.length],
        popping: false,
      };
    });

    setPrompt(correct.definition);
    setBalloons(nextBalloons);
    balloonsRef.current = nextBalloons;
    neckStrikeRef.current = null;
    setNeckStrike(null);
    setProcessing(false);
  }, [validCards, reducedMotion]);

  const clearNeckStrike = useCallback(() => {
    neckStrikeRef.current = null;
    setNeckStrike(null);
  }, []);

  const resolveBalloonHit = useCallback(
    (balloon: Balloon) => {
      if (phase !== "playing" || balloon.popping) return;

      clearNeckStrike();

      if (balloon.isCorrect) {
        setProcessing(true);
        speakEnglish(balloon.text);
        setScore((s) => s + 100 + combo * 15);
        setCombo((c) => c + 1);
        setBalloons((prev) =>
          prev.map((b) => (b.id === balloon.id ? { ...b, popping: true } : b))
        );
        window.setTimeout(() => spawnRound(), 450);
        return;
      }

      setCombo(0);
      setWrongId(balloon.id);
      setProcessing(false);
      window.setTimeout(() => setWrongId(null), 450);
    },
    [phase, combo, spawnRound, clearNeckStrike]
  );

  const findBalloonOnRay = useCallback(
    (ox: number, oy: number, tx: number, ty: number, current: Balloon[]): Balloon | null => {
      const dx = tx - ox;
      const dy = ty - oy;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 1) return null;

      let best: { balloon: Balloon; t: number } | null = null;

      for (const balloon of current) {
        if (balloon.popping) continue;
        const { cx, cy } = balloonCenter(balloon);
        const dist = distanceToSegment(cx, cy, ox, oy, tx, ty);
        if (dist > RAY_HIT_THRESHOLD) continue;

        const t = ((cx - ox) * dx + (cy - oy) * dy) / lenSq;
        if (t < 0.05) continue;

        if (!best || t < best.t) {
          best = { balloon, t };
        }
      }

      return best?.balloon ?? null;
    },
    []
  );

  const getNeckOrigin = useCallback((arena: HTMLElement, pivot: HTMLElement) => {
    const arenaRect = arena.getBoundingClientRect();
    const pivotRect = pivot.getBoundingClientRect();
    return {
      x: pivotRect.left - arenaRect.left + pivotRect.width / 2,
      y: pivotRect.top - arenaRect.top + pivotRect.height / 2,
    };
  }, []);

  function startGame() {
    setScore(0);
    setCombo(0);
    setTimeLeft(ROUND_SECONDS);
    setWrongId(null);
    setProcessing(false);
    neckStrikeRef.current = null;
    setNeckStrike(null);
    balloonsRef.current = [];
    setBalloons([]);
    setPhase("playing");
    window.requestAnimationFrame(() => spawnRound());
  }

  function beginNeckStrike(originX: number, originY: number, clickX: number, clickY: number) {
    const dx = clickX - originX;
    const dy = clickY - originY;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;

    const angle = Math.atan2(dy, dx);
    // The tap point is always inside the arena, so the head can reach it directly.
    const targetLength = dist;

    const next: NeckStrike = {
      originX,
      originY,
      angle,
      length: 0,
      targetLength,
      phase: "extending",
    };

    neckStrikeRef.current = next;
    setNeckStrike(next);
    setProcessing(true);
  }

  function handleArenaPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (phase !== "playing" || processing || neckStrike) return;

    const arena = arenaRef.current;
    const pivot = neckOriginRef.current;
    if (!arena || !pivot) return;

    e.preventDefault();

    const arenaRect = arena.getBoundingClientRect();
    const clickX = e.clientX - arenaRect.left;
    const clickY = e.clientY - arenaRect.top;
    const origin = getNeckOrigin(arena, pivot);
    const currentBalloons = balloonsRef.current;

    if (reducedMotion) {
      const hit =
        findBalloonOnRay(origin.x, origin.y, clickX, clickY, currentBalloons) ??
        findBalloonAtHead(clickX, clickY, currentBalloons);
      if (hit) {
        resolveBalloonHit(hit);
      }
      return;
    }

    beginNeckStrike(origin.x, origin.y, clickX, clickY);
  }

  useEffect(() => {
    if (phase !== "playing") return;

    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setPhase("finished");
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing" || reducedMotion || balloons.length === 0) return;

    let animId = 0;

    const tick = () => {
      const arena = arenaRef.current;
      if (!arena) {
        animId = window.requestAnimationFrame(tick);
        return;
      }

      const width = arena.clientWidth;
      const height = arena.clientHeight;
      const pad = 4;
      const maxX = width - BALLOON_SIZE - pad;
      const maxY = height - BALLOON_SIZE - pad - SHOOTER_ZONE;

      const movedBalloons = balloonsRef.current.map((b) => {
        if (b.popping) return b;

        let { x, y, vx, vy } = b;
        x += vx;
        y += vy;

        if (x < pad) {
          x = pad;
          vx = Math.abs(vx);
        }
        if (y < pad) {
          y = pad;
          vy = Math.abs(vy);
        }
        if (x > maxX) {
          x = maxX;
          vx = -Math.abs(vx);
        }
        if (y > maxY) {
          y = maxY;
          vy = -Math.abs(vy);
        }

        return { ...b, x, y, vx, vy };
      });

      const prevNeck = neckStrikeRef.current;
      let nextNeck = prevNeck ? { ...prevNeck } : null;
      let hitBalloon: Balloon | null = null;

      if (nextNeck) {
        if (nextNeck.phase === "extending") {
          nextNeck.length += NECK_SPEED;
          const { x: headX, y: headY } = neckHeadPosition(nextNeck);
          hitBalloon = findBalloonAtHead(headX, headY, movedBalloons);

          if (hitBalloon) {
            nextNeck = null;
          } else if (nextNeck.length >= nextNeck.targetLength) {
            nextNeck.phase = "retracting";
          }
        } else {
          nextNeck.length -= NECK_SPEED;
          if (nextNeck.length <= 0) {
            nextNeck = null;
          }
        }
      }

      balloonsRef.current = movedBalloons;
      neckStrikeRef.current = nextNeck;
      setBalloons(movedBalloons);
      setNeckStrike(nextNeck);

      if (hitBalloon) {
        resolveBalloonHit(hitBalloon);
      } else if (prevNeck?.phase === "retracting" && nextNeck === null) {
        setProcessing(false);
      }

      animId = window.requestAnimationFrame(tick);
    };

    animId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animId);
  }, [phase, reducedMotion, balloons.length, resolveBalloonHit]);

  if (validCards.length < MIN_CARDS) {
    return (
      <p style={{ color: "var(--ink-light)" }}>
        Blast needs at least {MIN_CARDS} flashcards with terms and definitions.
      </p>
    );
  }

  if (phase === "idle") {
    return (
      <div className="blast-game">
        <p className="flashcard-hint">
          Stretch the neck to hit the balloon that matches the definition. You have{" "}
          {ROUND_SECONDS} seconds!
        </p>
        <button type="button" className="btn btn-primary" onClick={startGame}>
          Start Blast
        </button>
      </div>
    );
  }

  if (phase === "finished") {
    return (
      <div className="blast-game blast-game-finished">
        <p className="blast-done-title">Time&apos;s up!</p>
        <p className="blast-done-score">Final score: <strong>{score}</strong></p>
        <button type="button" className="btn btn-primary" onClick={startGame}>
          Play again
        </button>
      </div>
    );
  }

  const displayNeck = neckStrike;
  const neckRotate = displayNeck ? neckRotateDeg(displayNeck.angle) : 0;
  const neckLength = displayNeck ? Math.max(0, displayNeck.length) : 0;

  return (
    <div className="blast-game">
      <div className="blast-header">
        <span className="blast-stat">
          <span className="blast-stat-label">Time</span>
          <span className="blast-stat-value">{timeLeft}s</span>
        </span>
        <span className="blast-stat">
          <span className="blast-stat-label">Score</span>
          <span className="blast-stat-value">{score}</span>
        </span>
        <span className="blast-stat">
          <span className="blast-stat-label">Combo</span>
          <span className="blast-stat-value">{combo}x</span>
        </span>
      </div>

      <p className="blast-prompt">
        <span className="blast-prompt-label">Find the term:</span>
        {prompt}
      </p>

      <div
        ref={arenaRef}
        className="blast-arena"
        onPointerDown={handleArenaPointerDown}
      >
        {balloons.map((balloon) => (
          <div
            key={balloon.id}
            className={`blast-balloon${balloon.popping ? " pop" : ""}${wrongId === balloon.id ? " wrong" : ""}`}
            style={{
              left: balloon.x,
              top: balloon.y,
              "--balloon-color": balloon.color,
            } as React.CSSProperties}
          >
            <span className="blast-balloon-body">
              <span className="blast-balloon-text">{balloon.text}</span>
            </span>
            <span className="blast-balloon-string" aria-hidden="true" />
          </div>
        ))}

        <div className="blast-shooter-anchor" aria-hidden="true">
          {/* Full toilet behind the head (lid + tank) */}
          <div className="blast-toilet-back">
            {shooterImgOk ? (
              <img
                src={TOILET_IMAGE}
                alt=""
                className="blast-toilet-img"
                onError={() => setShooterImgOk(false)}
              />
            ) : (
              <span className="blast-shooter-fallback">🚽</span>
            )}
          </div>

          <div
            ref={neckOriginRef}
            className="blast-neck-pivot"
            style={
              displayNeck
                ? { transform: `rotate(${neckRotate}deg)` }
                : undefined
            }
          >
            <div className={`blast-neck-head${displayNeck ? " striking" : ""}`}>
              {shooterImgOk ? (
                <img
                  src={HEAD_IMAGE}
                  alt=""
                  className="blast-head-img"
                  onError={() => setShooterImgOk(false)}
                />
              ) : (
                <span className="blast-head-fallback">😀</span>
              )}
            </div>
            {neckLength > 0 && (
              <div
                className="blast-neck-segment"
                style={{ height: `${neckLength}px` }}
              />
            )}
          </div>

          {/* Bottom-cropped toilet copy in front: front rim hides the head's lower part */}
          {shooterImgOk && (
            <div className="blast-toilet-front">
              <img src={TOILET_IMAGE} alt="" className="blast-toilet-img" />
            </div>
          )}
        </div>
      </div>

      <p className="flashcard-hint">Tap to aim and stretch the neck!</p>
    </div>
  );
}
