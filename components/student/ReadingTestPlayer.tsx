"use client";

import { PassageHighlighter } from "@/components/student/PassageHighlighter";
import { optionLetter, type TestContent, type TestParagraph } from "@/lib/test-content";
import { memo, useMemo, useState } from "react";

type Props = {
  content: TestContent;
};

export function ReadingTestPlayer({ content }: Props) {
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [submitted, setSubmitted] = useState(false);

  const totalQuestions = useMemo(
    () => content.questionSets.reduce((total, set) => total + set.questions.length, 0),
    [content.questionSets]
  );

  const score = useMemo(() => {
    if (!submitted) return null;
    let correct = 0;

    for (const set of content.questionSets) {
      for (const question of set.questions) {
        const key = answerKey(set.id, question.number);
        if (answers[key] === question.correctOptionIndex) correct += 1;
      }
    }

    return { correct, total: totalQuestions };
  }, [submitted, content.questionSets, answers, totalQuestions]);

  function handleCheck() {
    setSubmitted(true);
  }

  function handleRetry() {
    setSubmitted(false);
    setAnswers({});
  }

  return (
    <div className="reading-test">
      <div className="reading-test-layout">
        <ReadingTestPassage
          passageTitle={content.passageTitle}
          paragraphs={content.paragraphs}
        />

        <section className="reading-test-questions" aria-label="Questions">
          {content.questionSets.map((set) => (
            <div key={set.id} className="reading-test-set">
              <h3 className="reading-test-set-title">{set.rangeLabel}</h3>
              {set.instruction && (
                <p className="reading-test-set-instruction">{set.instruction}</p>
              )}

              <div className="reading-test-mcq-list">
                {set.questions.map((question) => {
                  const key = answerKey(set.id, question.number);
                  const selected = answers[key] ?? null;
                  const isCorrect =
                    submitted && selected === question.correctOptionIndex;
                  const isWrong =
                    submitted && selected !== question.correctOptionIndex;

                  return (
                    <div
                      key={key}
                      className={`reading-test-mcq ${isCorrect ? "is-correct" : ""} ${isWrong ? "is-wrong" : ""}`}
                    >
                      <div className="reading-test-mcq-prompt">
                        <span className="reading-test-q-num">{question.number}</span>
                        <p>{question.prompt}</p>
                      </div>
                      <div className="reading-test-mcq-options" role="radiogroup">
                        {question.options.map((option, optionIndex) => {
                          const optionIsCorrect =
                            submitted && optionIndex === question.correctOptionIndex;
                          const optionIsSelectedWrong =
                            submitted &&
                            selected === optionIndex &&
                            optionIndex !== question.correctOptionIndex;

                          return (
                            <label
                              key={optionIndex}
                              className={`reading-test-mcq-option ${optionIsCorrect ? "is-correct-option" : ""} ${optionIsSelectedWrong ? "is-wrong-option" : ""}`}
                            >
                              <input
                                type="radio"
                                name={key}
                                value={optionIndex}
                                checked={selected === optionIndex}
                                disabled={submitted}
                                onChange={() =>
                                  setAnswers((prev) => ({
                                    ...prev,
                                    [key]: optionIndex,
                                  }))
                                }
                              />
                              <span className="reading-test-mcq-letter">
                                {optionLetter(optionIndex)}
                              </span>
                              <span>{option}</span>
                            </label>
                          );
                        })}
                      </div>
                      {submitted && isWrong && (
                        <p className="reading-test-reveal">
                          Answer: {optionLetter(question.correctOptionIndex)} —{" "}
                          {question.options[question.correctOptionIndex]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="reading-test-actions">
            {!submitted ? (
              <button type="button" className="btn btn-primary" onClick={handleCheck}>
                Check answers
              </button>
            ) : (
              <>
                {score && (
                  <p className="reading-test-score">
                    Score: {score.correct}/{score.total}
                  </p>
                )}
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

const ReadingTestPassage = memo(function ReadingTestPassage({
  passageTitle,
  paragraphs,
}: {
  passageTitle: string;
  paragraphs: TestParagraph[];
}) {
  return (
    <section className="reading-test-passage" aria-label="Reading passage">
      <h2 className="reading-test-passage-title">{passageTitle}</h2>
      <PassageHighlighter>
        <div className="reading-test-paragraphs">
          {paragraphs.map((paragraph) => (
            <p key={paragraph.label} className="reading-test-paragraph">
              <strong className="reading-test-para-label">{paragraph.label}.</strong>{" "}
              {paragraph.text}
            </p>
          ))}
        </div>
      </PassageHighlighter>
    </section>
  );
});

function answerKey(setId: string, number: number) {
  return `${setId}-mcq-${number}`;
}
