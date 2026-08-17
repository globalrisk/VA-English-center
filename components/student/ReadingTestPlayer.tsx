"use client";

import { PassageHighlighter } from "@/components/student/PassageHighlighter";
import { createClient } from "@/lib/supabase/client";
import {
  ensureSingleQuestionSet,
  formatCorrectAnswers,
  isOptionCorrect,
  optionLetter,
  type MultipleChoiceQuestion,
  type QuestionPassageLocation,
  type TestContent,
  type TestParagraph,
} from "@/lib/test-content";
import type { TestAttempt } from "@/types/course";
import { memo, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  lessonId: string;
  content: TestContent;
  isAdmin?: boolean;
  initialAttempt?: TestAttempt | null;
  onComplete?: () => void | Promise<void>;
};

type TestPhase =
  | "first-attempt"
  | "first-result"
  | "retry"
  | "second-result"
  | "revealed";

type ActiveAnswerLocation = {
  questionNumber: number;
  optionIndex: number;
};

export function ReadingTestPlayer({
  lessonId,
  content,
  isAdmin = false,
  initialAttempt = null,
  onComplete,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [phase, setPhase] = useState<TestPhase>("first-attempt");
  const [retryQuestionNumbers, setRetryQuestionNumbers] = useState<number[]>([]);
  const [latestWrongNumbers, setLatestWrongNumbers] = useState<number[]>([]);
  const [activeAnswerLocation, setActiveAnswerLocation] =
    useState<ActiveAnswerLocation | null>(null);
  const [attempt, setAttempt] = useState<TestAttempt | null>(initialAttempt);
  const [attemptLoading, setAttemptLoading] = useState(
    !isAdmin && !initialAttempt
  );
  const [savingFirstScore, setSavingFirstScore] = useState(false);
  const [attemptError, setAttemptError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const timeoutSubmitRef = useRef<() => void>(() => undefined);

  const questions = useMemo(
    () => ensureSingleQuestionSet(content).questions,
    [content]
  );

  const totalPoints = questions.reduce(
    (total, question) => total + question.correctOptionIndexes.length,
    0
  );
  const hasSavedScore = Boolean(attempt?.submitted_at);
  const isTimedFirstAttempt =
    !isAdmin && Boolean(attempt) && !attempt?.submitted_at;
  const isRevealed = phase === "revealed";
  const isSubmissionResult =
    phase === "first-result" || phase === "second-result";
  const isFocusedRetry = phase === "retry" || phase === "second-result";
  const retryNumberSet = useMemo(
    () => new Set(retryQuestionNumbers),
    [retryQuestionNumbers]
  );
  const latestWrongNumberSet = useMemo(
    () => new Set(latestWrongNumbers),
    [latestWrongNumbers]
  );

  const score = useMemo(() => {
    let earned = 0;

    for (const question of questions) {
      const key = answerKey(question.number);
      const selected = answers[key] ?? [];
      earned += earnedPoints(question, selected);
    }

    return { earned, total: totalPoints };
  }, [questions, answers, totalPoints]);

  const requiredQuestions =
    phase === "retry"
      ? questions.filter((question) => retryNumberSet.has(question.number))
      : questions;
  const visibleQuestions = isFocusedRetry
    ? questions.filter((question) => retryNumberSet.has(question.number))
    : questions;
  const canSubmit =
    requiredQuestions.length > 0 &&
    requiredQuestions.some(
      (question) =>
        (answers[answerKey(question.number)]?.length ?? 0) > 0
    );

  const activeLocation = activeAnswerLocation
    ? questions.find(
        (question) => question.number === activeAnswerLocation.questionNumber
      )?.answerLocations[activeAnswerLocation.optionIndex] ?? null
    : null;
  const visibleParagraphs = useMemo(
    () =>
      isFocusedRetry
        ? mappedParagraphsForQuestions(
            content.paragraphs,
            questions.filter((question) =>
              retryNumberSet.has(question.number)
            )
          )
        : content.paragraphs,
    [content.paragraphs, isFocusedRetry, questions, retryNumberSet]
  );

  useEffect(() => {
    if (!activeLocation) return;
    document
      .getElementById("reading-test-active-location")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeLocation, activeAnswerLocation]);

  useEffect(() => {
    if (isAdmin || initialAttempt) return;
    let cancelled = false;

    async function startAttempt() {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("start_test_attempt", {
        test_lesson_id: lessonId,
      });
      if (cancelled) return;
      setAttemptLoading(false);
      if (error) {
        setAttemptError(error.message);
        return;
      }
      const started = (Array.isArray(data) ? data[0] : data) as TestAttempt | null;
      if (!started) {
        setAttemptError("Could not start this test attempt.");
        return;
      }
      setAttempt(started);
    }

    void startAttempt();
    return () => {
      cancelled = true;
    };
  }, [initialAttempt, isAdmin, lessonId]);

  useEffect(() => {
    if (!isTimedFirstAttempt || !attempt || phase !== "first-attempt") {
      setSecondsRemaining(null);
      return;
    }

    const deadline =
      new Date(attempt.started_at).getTime() +
      attempt.time_limit_minutes * 60_000;

    function updateTimer() {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining === 0) {
        setTimedOut(true);
        timeoutSubmitRef.current();
      }
    }

    updateTimer();
    const interval = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(interval);
  }, [attempt, isTimedFirstAttempt, phase]);

  function wrongQuestionNumbers() {
    return questions
      .filter((question) => {
        const selected = answers[answerKey(question.number)] ?? [];
        return !questionIsFullyCorrect(question, selected);
      })
      .map((question) => question.number);
  }

  async function handleSubmit(force = false) {
    if ((!canSubmit && !force) || savingFirstScore || attemptLoading) return;
    const wrongNumbers = wrongQuestionNumbers();

    if (isTimedFirstAttempt) {
      setSavingFirstScore(true);
      setAttemptError(null);
      const submittedAnswers = Object.fromEntries(
        questions.map((question) => [
          String(question.number),
          answers[answerKey(question.number)] ?? [],
        ])
      );
      const supabase = createClient();
      const { data, error } = await supabase.rpc("submit_test_attempt", {
        test_lesson_id: lessonId,
        test_answers: submittedAnswers,
      });
      setSavingFirstScore(false);

      if (error) {
        setAttemptError(error.message);
        return;
      }

      const saved = (Array.isArray(data) ? data[0] : data) as TestAttempt | null;
      if (!saved) {
        setAttemptError("Could not save your first test score.");
        return;
      }
      setAttempt(saved);
      void onComplete?.();
    }

    setLatestWrongNumbers(wrongNumbers);
    setActiveAnswerLocation(null);
    setPhase(phase === "retry" ? "second-result" : "first-result");
  }

  timeoutSubmitRef.current = () => {
    if (!savingFirstScore && !timedOut) void handleSubmit(true);
  };

  function handleRedoWrong() {
    const wrongSet = new Set(latestWrongNumbers);
    setAnswers((current) => {
      const next = { ...current };
      for (const number of wrongSet) {
        delete next[answerKey(number)];
      }
      return next;
    });
    setRetryQuestionNumbers(latestWrongNumbers);
    setActiveAnswerLocation(null);
    setPhase("retry");
  }

  function handleReveal() {
    setActiveAnswerLocation(null);
    setPhase("revealed");
  }

  function handleRetry() {
    setPhase("first-attempt");
    setRetryQuestionNumbers([]);
    setLatestWrongNumbers([]);
    setActiveAnswerLocation(null);
    setTimedOut(false);
    setAnswers({});
  }

  function toggleLocation(
    question: MultipleChoiceQuestion,
    optionIndex: number
  ) {
    if (!question.answerLocations[optionIndex]) return;
    setActiveAnswerLocation((current) =>
      current?.questionNumber === question.number &&
      current.optionIndex === optionIndex
        ? null
        : { questionNumber: question.number, optionIndex }
    );
  }

  function selectSingle(key: string, optionIndex: number) {
    setAnswers((prev) => ({ ...prev, [key]: [optionIndex] }));
  }

  function toggleMultiple(
    key: string,
    question: MultipleChoiceQuestion,
    optionIndex: number
  ) {
    setAnswers((prev) => {
      const current = prev[key] ?? [];
      const hasOption = current.includes(optionIndex);
      if (
        !hasOption &&
        current.length >= question.correctOptionIndexes.length
      ) {
        return prev;
      }
      const next = hasOption
        ? current.filter((i) => i !== optionIndex)
        : [...current, optionIndex].sort((a, b) => a - b);
      return { ...prev, [key]: next };
    });
  }

  return (
    <div className="reading-test">
      <div className="reading-test-attempt-status" aria-live="polite">
        {isAdmin ? (
          <>
            <strong>Admin preview</strong>
            <span>No timer or score is saved.</span>
          </>
        ) : attemptLoading ? (
          <>
            <strong>Preparing timed attempt…</strong>
            <span>Your timer will use the server start time.</span>
          </>
        ) : hasSavedScore && attempt ? (
          <>
            <strong>
              Saved first score: {attempt.correct_count}/{attempt.total_questions} (
              {formatPercentage(attempt.percentage)}%)
            </strong>
            <span>Practice attempts cannot change this score.</span>
          </>
        ) : secondsRemaining != null ? (
          <>
            <strong className={secondsRemaining <= 60 ? "is-urgent" : ""}>
              Time remaining: {formatTime(secondsRemaining)}
            </strong>
            <span>Your first submission will be saved permanently.</span>
          </>
        ) : null}
        {timedOut && (
          <span className="reading-test-timeout-message">
            Time expired. Your current answers were submitted.
          </span>
        )}
        {attemptError && (
          <span className="reading-test-attempt-error">{attemptError}</span>
        )}
      </div>

      <div className="reading-test-layout">
        <ReadingTestPassage
          passageTitle={content.passageTitle}
          paragraphs={visibleParagraphs}
          activeLocation={activeLocation}
        />

        <section className="reading-test-questions" aria-label="Questions">
          <div className="reading-test-mcq-list">
            {visibleQuestions.map((question) => {
              const key = answerKey(question.number);
              const selected = answers[key] ?? [];
              const answerIsCorrect = questionIsFullyCorrect(
                question,
                selected
              );
              const showCardResult = isSubmissionResult || isRevealed;
              const isWrong =
                showCardResult &&
                (isRevealed
                  ? !answerIsCorrect
                  : latestWrongNumberSet.has(question.number));
              const isCorrect = showCardResult && !isWrong;
              const isShowingLocation =
                activeAnswerLocation?.questionNumber === question.number;
              const isRetryQuestion = phase === "retry";
              const inputDisabled =
                phase !== "first-attempt" && phase !== "retry";

              return (
                <div
                  key={key}
                  id={`reading-test-q-${question.number}`}
                  className={`reading-test-mcq ${isCorrect ? "is-correct" : ""} ${isWrong ? "is-wrong" : ""} ${isShowingLocation ? "is-showing-location" : ""} ${isRetryQuestion ? "is-retry-question" : ""}`}
                >
                  <div className="reading-test-mcq-prompt">
                    <span className="reading-test-q-num">{question.number}</span>
                    <div>
                      <p>{question.prompt}</p>
                      {question.choiceMode === "multiple" && (
                        <p className="reading-test-select-hint">
                          Choose {question.correctOptionIndexes.length} answers —{" "}
                          {question.correctOptionIndexes.length} points.
                        </p>
                      )}
                    </div>
                  </div>
                  <div
                    className="reading-test-mcq-options"
                    role={question.choiceMode === "single" ? "radiogroup" : "group"}
                  >
                    {question.options.map((option, optionIndex) => (
                      <OptionRow
                        key={optionIndex}
                        question={question}
                        option={option}
                        optionIndex={optionIndex}
                        selected={selected}
                        revealResults={isRevealed}
                        disabled={inputDisabled}
                        inputName={key}
                        onSelectSingle={() => selectSingle(key, optionIndex)}
                        onToggleMultiple={() =>
                          toggleMultiple(key, question, optionIndex)
                        }
                      />
                    ))}
                  </div>
                  {isRevealed && isWrong && (
                    <p className="reading-test-reveal">
                      Answer: {formatCorrectAnswers(question)}
                    </p>
                  )}
                  {isRevealed && (
                    <div className="reading-test-location-actions">
                      {question.correctOptionIndexes.map((optionIndex) => {
                        const isActive =
                          activeAnswerLocation?.questionNumber ===
                            question.number &&
                          activeAnswerLocation.optionIndex === optionIndex;
                        const hasLocation = Boolean(
                          question.answerLocations[optionIndex]
                        );
                        return (
                          <button
                            key={optionIndex}
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={!hasLocation}
                            aria-expanded={isActive}
                            aria-controls={`reading-test-explanation-${question.number}`}
                            onClick={() =>
                              toggleLocation(question, optionIndex)
                            }
                          >
                            {isActive ? "Hide" : "Show"} location for answer{" "}
                            {optionLetter(optionIndex)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {isRevealed && isShowingLocation && (
                    <QuestionExplanationDropdown question={question} />
                  )}
                </div>
              );
            })}
          </div>

          <div className="reading-test-actions">
            {(phase === "first-attempt" || phase === "retry") && (
              <>
                <p className="reading-test-attempt-guidance">
                  {phase === "retry"
                    ? "Retry any incorrect questions you want. Unanswered questions remain incorrect."
                    : "Submit whenever you are ready. Unanswered questions count as incorrect."}
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={
                    !canSubmit ||
                    attemptLoading ||
                    savingFirstScore ||
                    (!isAdmin && !attempt)
                  }
                  onClick={() => void handleSubmit()}
                >
                  {savingFirstScore ? "Saving first score…" : "Submit answers"}
                </button>
              </>
            )}

            {phase === "first-result" && latestWrongNumbers.length > 0 && (
              <>
                <p className="reading-test-attempt-guidance">
                  Some answers need another try.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleRedoWrong}
                >
                  Redo wrong questions
                </button>
              </>
            )}

            {(phase === "second-result" ||
              (phase === "first-result" &&
                latestWrongNumbers.length === 0)) && (
              <>
                <p className="reading-test-attempt-guidance">
                  {latestWrongNumbers.length === 0
                    ? "All answers are correct."
                    : "Your second attempt is complete."}
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleReveal}
                >
                  Check answers
                </button>
              </>
            )}

            {isRevealed && (
              <>
                <p className="reading-test-score">
                  {hasSavedScore ? "Practice score" : "Score"}: {score.earned}/
                  {score.total} ({Math.round((score.earned / score.total) * 100)}%)
                </p>
                <button type="button" className="btn btn-secondary" onClick={handleRetry}>
                  Try again
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function QuestionExplanationDropdown({
  question,
}: {
  question: MultipleChoiceQuestion;
}) {
  const explanation = question.explanation.trim();

  return (
    <div
      id={`reading-test-explanation-${question.number}`}
      className="reading-test-location-details"
      aria-label={`Explanation for question ${question.number}`}
    >
      <div className="reading-test-explain-text">{explanation}</div>
    </div>
  );
}

function OptionRow({
  question,
  option,
  optionIndex,
  selected,
  revealResults,
  disabled,
  inputName,
  onSelectSingle,
  onToggleMultiple,
}: {
  question: MultipleChoiceQuestion;
  option: string;
  optionIndex: number;
  selected: number[];
  revealResults: boolean;
  disabled: boolean;
  inputName: string;
  onSelectSingle: () => void;
  onToggleMultiple: () => void;
}) {
  const isSelected = selected.includes(optionIndex);
  const optionIsCorrect =
    revealResults && isOptionCorrect(question, optionIndex);
  const optionIsSelectedWrong =
    revealResults && isSelected && !isOptionCorrect(question, optionIndex);

  return (
    <label
      className={`reading-test-mcq-option ${optionIsCorrect ? "is-correct-option" : ""} ${optionIsSelectedWrong ? "is-wrong-option" : ""}`}
    >
      <input
        type={question.choiceMode === "single" ? "radio" : "checkbox"}
        name={question.choiceMode === "single" ? inputName : undefined}
        value={optionIndex}
        checked={isSelected}
        disabled={disabled}
        onChange={() => {
          if (question.choiceMode === "single") onSelectSingle();
          else onToggleMultiple();
        }}
      />
      <span className="reading-test-mcq-letter">{optionLetter(optionIndex)}</span>
      <span>{option}</span>
    </label>
  );
}

const ReadingTestPassage = memo(function ReadingTestPassage({
  passageTitle,
  paragraphs,
  activeLocation,
}: {
  passageTitle: string;
  paragraphs: TestParagraph[];
  activeLocation: QuestionPassageLocation | null;
}) {
  const targetParagraphIndex = activeLocation
    ? findLocationParagraph(paragraphs, activeLocation)
    : -1;

  return (
    <section className="reading-test-passage" aria-label="Reading passage">
      <h2 className="reading-test-passage-title">{passageTitle}</h2>
      <PassageHighlighter>
        <div className="reading-test-paragraphs">
          {paragraphs.map((paragraph, index) => (
            <p key={paragraph.label} className="reading-test-paragraph">
              <strong className="reading-test-para-label">{paragraph.label}.</strong>{" "}
              {index === targetParagraphIndex && activeLocation
                ? renderLocatedText(paragraph.text, activeLocation.text)
                : paragraph.text}
            </p>
          ))}
        </div>
      </PassageHighlighter>
    </section>
  );
});

function findLocationParagraph(
  paragraphs: TestParagraph[],
  location: QuestionPassageLocation
) {
  const labeled = paragraphs.findIndex(
    (paragraph) =>
      paragraph.label === location.paragraphLabel &&
      paragraph.text.includes(location.text)
  );
  if (labeled >= 0) return labeled;
  return paragraphs.findIndex((paragraph) => paragraph.text.includes(location.text));
}

function mappedParagraphsForQuestions(
  paragraphs: TestParagraph[],
  questions: MultipleChoiceQuestion[]
) {
  const relatedIndexes = new Set<number>();

  for (const question of questions) {
    for (const correctIndex of question.correctOptionIndexes) {
      const location = question.answerLocations[correctIndex];
      if (!location) continue;
      const index = findLocationParagraph(paragraphs, location);
      if (index >= 0) relatedIndexes.add(index);
    }
  }

  return paragraphs.filter((_, index) => relatedIndexes.has(index));
}

function renderLocatedText(paragraphText: string, selectedText: string) {
  const start = paragraphText.indexOf(selectedText);
  if (start < 0) return paragraphText;
  const end = start + selectedText.length;

  return (
    <>
      {paragraphText.slice(0, start)}
      <mark
        id="reading-test-active-location"
        className="reading-test-location-highlight"
      >
        {paragraphText.slice(start, end)}
      </mark>
      {paragraphText.slice(end)}
    </>
  );
}

function answerKey(number: number) {
  return `mcq-${number}`;
}

function earnedPoints(
  question: MultipleChoiceQuestion,
  selected: number[]
) {
  return question.correctOptionIndexes.filter((index) =>
    selected.includes(index)
  ).length;
}

function questionIsFullyCorrect(
  question: MultipleChoiceQuestion,
  selected: number[]
) {
  return (
    selected.length === question.correctOptionIndexes.length &&
    earnedPoints(question, selected) === question.correctOptionIndexes.length
  );
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatPercentage(value: number | null) {
  if (value == null) return "0";
  const numeric = Number(value);
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2);
}
