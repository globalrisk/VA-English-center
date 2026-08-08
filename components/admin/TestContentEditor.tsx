"use client";

import { AutoTextarea } from "@/components/ui/AutoTextarea";
import {
  emptyMultipleChoiceQuestion,
  emptyOptions,
  ensureSingleQuestionSet,
  isOptionCorrect,
  optionLetter,
  remapCorrectIndexesAfterOptionRemoval,
  renumberTestContent,
  setQuestionChoiceMode,
  toggleCorrectOption,
  withSingleQuestionSet,
  type ChoiceMode,
  type MultipleChoiceQuestion,
  type MultipleChoiceSet,
  type QuestionPassageLocation,
  type TestContent,
} from "@/lib/test-content";
import { useState } from "react";

type Props = {
  value: TestContent;
  disabled?: boolean;
  fullHeight?: boolean;
  onChange: (value: TestContent) => void;
};

const MIN_OPTIONS = 2;

export function TestContentEditor({
  value,
  disabled,
  fullHeight = false,
  onChange,
}: Props) {
  const set = ensureSingleQuestionSet(value);
  const [passageSelection, setPassageSelection] =
    useState<QuestionPassageLocation | null>(null);

  function emit(next: TestContent) {
    onChange(renumberTestContent(next));
  }

  function patch(updates: Partial<TestContent>) {
    emit({ ...value, ...updates });
  }

  function updateSet(next: MultipleChoiceSet) {
    emit(withSingleQuestionSet(value, next));
  }

  function updateParagraph(index: number, field: "label" | "text", next: string) {
    patch({
      paragraphs: value.paragraphs.map((p, i) =>
        i === index ? { ...p, [field]: next } : p
      ),
    });
  }

  function addParagraph() {
    const nextLabel = String.fromCharCode(65 + value.paragraphs.length);
    patch({
      paragraphs: [...value.paragraphs, { label: nextLabel, text: "" }],
    });
  }

  function removeParagraph(index: number) {
    if (value.paragraphs.length <= 1) return;
    patch({ paragraphs: value.paragraphs.filter((_, i) => i !== index) });
  }

  return (
    <div
      className={`test-editor-layout ${fullHeight ? "test-editor-layout--full" : ""}`}
    >
      <section className="test-editor-passage" aria-label="Passage editor">
        <label className="test-editor-time-limit">
          <span>First-attempt time limit</span>
          <span className="test-editor-time-limit-control">
            <input
              type="number"
              min={1}
              max={240}
              step={1}
              value={value.timeLimitMinutes}
              disabled={disabled}
              aria-label="Test time limit in minutes"
              onChange={(e) =>
                patch({ timeLimitMinutes: Number(e.target.value) })
              }
            />
            minutes
          </span>
        </label>
        <input
          type="text"
          className="reading-test-passage-title test-editor-field test-editor-field-title"
          value={value.passageTitle}
          disabled={disabled}
          placeholder="Passage title…"
          aria-label="Passage title"
          onChange={(e) => patch({ passageTitle: e.target.value })}
        />

        <div className="test-editor-paragraphs">
          {value.paragraphs.map((paragraph, index) => (
            <div key={index} className="test-editor-paragraph">
              <div className="test-editor-paragraph-row">
                <input
                  type="text"
                  className="test-editor-field test-editor-field-label"
                  value={paragraph.label}
                  disabled={disabled}
                  aria-label={`Paragraph ${index + 1} label`}
                  onChange={(e) => updateParagraph(index, "label", e.target.value)}
                />
                <span className="test-editor-label-dot" aria-hidden="true">
                  .
                </span>
                <AutoTextarea
                  className="reading-test-paragraph test-editor-field test-editor-field-paragraph"
                  value={paragraph.text}
                  disabled={disabled}
                  rows={3}
                  placeholder="Paragraph text…"
                  aria-label={`Paragraph ${paragraph.label || index + 1} text`}
                  onChange={(e) => updateParagraph(index, "text", e.target.value)}
                  onSelect={(e) => {
                    const target = e.currentTarget;
                    const text = target.value
                      .slice(target.selectionStart, target.selectionEnd)
                      .trim();
                    if (!text) return;
                    setPassageSelection({
                      paragraphLabel: paragraph.label,
                      text,
                    });
                  }}
                />
              </div>
              <div className="test-editor-controls">
                <button
                  type="button"
                  className="test-editor-icon-btn"
                  disabled={disabled || value.paragraphs.length <= 1}
                  title="Remove paragraph"
                  aria-label="Remove paragraph"
                  onClick={() => removeParagraph(index)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm test-editor-add"
          disabled={disabled}
          onClick={addParagraph}
        >
          + Add paragraph
        </button>
        <p className="test-editor-selection-note" aria-live="polite">
          {passageSelection
            ? `Selected from paragraph ${passageSelection.paragraphLabel || "?"}: “${passageSelection.text}”`
            : "Select text in a passage paragraph, then map it to a question."}
        </p>
      </section>

      <section className="test-editor-questions" aria-label="Questions editor">
        <MultipleChoiceQuestionsEditor
          set={set}
          disabled={disabled}
          passageSelection={passageSelection}
          onChange={updateSet}
        />
      </section>
    </div>
  );
}

function MultipleChoiceQuestionsEditor({
  set,
  disabled,
  passageSelection,
  onChange,
}: {
  set: MultipleChoiceSet;
  disabled?: boolean;
  passageSelection: QuestionPassageLocation | null;
  onChange: (set: MultipleChoiceSet) => void;
}) {
  function updateQuestion(index: number, question: MultipleChoiceQuestion) {
    onChange({
      ...set,
      questions: set.questions.map((q, i) => (i === index ? question : q)),
    });
  }

  function addQuestion() {
    const nextNumber =
      set.questions.reduce((max, q) => Math.max(max, q.number), 0) + 1 || 1;
    onChange({
      ...set,
      questions: [...set.questions, emptyMultipleChoiceQuestion(nextNumber)],
    });
  }

  function removeQuestion(index: number) {
    if (set.questions.length <= 1) return;
    onChange({
      ...set,
      questions: set.questions.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="reading-test-mcq-list">
      {set.questions.map((question, index) => (
        <div key={`q-${index}`} className="reading-test-mcq test-editor-mcq">
          <div className="reading-test-mcq-prompt">
            <span className="reading-test-q-num">{question.number}</span>
            <AutoTextarea
              className="test-editor-field test-editor-field-prompt"
              value={question.prompt}
              disabled={disabled}
              rows={2}
              placeholder="Question about the passage…"
              aria-label={`Question ${question.number}`}
              onChange={(e) =>
                updateQuestion(index, { ...question, prompt: e.target.value })
              }
            />
          </div>

          <div className="test-editor-choice-mode">
            <label htmlFor={`choice-mode-${index}`}>Answer type</label>
            <select
              id={`choice-mode-${index}`}
              value={question.choiceMode}
              disabled={disabled}
              onChange={(e) =>
                updateQuestion(
                  index,
                  setQuestionChoiceMode(question, e.target.value as ChoiceMode)
                )
              }
            >
              <option value="single">Single choice</option>
              <option value="multiple">Multiple choice</option>
            </select>
            <span className="test-editor-choice-hint">
              {question.choiceMode === "multiple"
                ? "Mark every correct option (students pick all that apply)."
                : "Mark exactly one correct option."}
            </span>
          </div>

          <div
            className="reading-test-mcq-options"
            role={question.choiceMode === "single" ? "radiogroup" : "group"}
            aria-label={`Correct answers for question ${question.number}`}
          >
            {question.options.map((option, optionIndex) => {
              const isCorrect = isOptionCorrect(question, optionIndex);
              return (
                <label
                  key={optionIndex}
                  className={`reading-test-mcq-option test-editor-option ${isCorrect ? "is-answer" : ""}`}
                >
                  <input
                    type={question.choiceMode === "single" ? "radio" : "checkbox"}
                    name={
                      question.choiceMode === "single"
                        ? `correct-${index}`
                        : undefined
                    }
                    checked={isCorrect}
                    disabled={disabled}
                    onChange={() =>
                      updateQuestion(index, toggleCorrectOption(question, optionIndex))
                    }
                  />
                  <span className="reading-test-mcq-letter">
                    {optionLetter(optionIndex)}
                  </span>
                  <input
                    type="text"
                    className="test-editor-field test-editor-field-option"
                    value={option}
                    disabled={disabled}
                    placeholder={`Option ${optionLetter(optionIndex)}`}
                    aria-label={`Question ${question.number} option ${optionLetter(optionIndex)}`}
                    onChange={(e) =>
                      updateQuestion(index, {
                        ...question,
                        options: question.options.map((opt, i) =>
                          i === optionIndex ? e.target.value : opt
                        ),
                      })
                    }
                  />
                  {isCorrect && (
                    <span className="test-editor-correct-badge" aria-hidden="true">
                      Correct
                    </span>
                  )}
                  <button
                    type="button"
                    className="test-editor-icon-btn"
                    disabled={disabled || question.options.length <= MIN_OPTIONS}
                    title="Remove option"
                    aria-label={`Remove option ${optionLetter(optionIndex)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const nextOptions = question.options.filter(
                        (_, i) => i !== optionIndex
                      );
                      updateQuestion(index, {
                        ...question,
                        options:
                          nextOptions.length >= MIN_OPTIONS
                            ? nextOptions
                            : emptyOptions(MIN_OPTIONS),
                        answerLocations:
                          nextOptions.length >= MIN_OPTIONS
                            ? question.answerLocations.filter(
                                (_, i) => i !== optionIndex
                              )
                            : Array.from(
                                { length: MIN_OPTIONS },
                                () => null
                              ),
                        correctOptionIndexes: remapCorrectIndexesAfterOptionRemoval(
                          question,
                          optionIndex
                        ),
                      });
                    }}
                  >
                    ×
                  </button>
                </label>
              );
            })}
          </div>

          <div className="test-editor-explanation">
            <label htmlFor={`explanation-${index}`}>Answer explanation</label>
            <AutoTextarea
              id={`explanation-${index}`}
              className="test-editor-field test-editor-field-explanation"
              value={question.explanation}
              disabled={disabled}
              rows={3}
              placeholder="Optional: walk students through the answer after they finish…"
              aria-label={`Question ${question.number} explanation`}
              onChange={(e) =>
                updateQuestion(index, {
                  ...question,
                  explanation: e.target.value,
                })
              }
            />
          </div>

          <div className="test-editor-location">
            <div className="test-editor-location-heading">
              <span>Correct-answer passage mappings</span>
            </div>
            <div className="test-editor-answer-locations">
              {question.correctOptionIndexes.map((optionIndex) => {
                const location = question.answerLocations[optionIndex];
                return (
                  <div
                    key={optionIndex}
                    className="test-editor-answer-location"
                  >
                    <div className="test-editor-answer-location-actions">
                      <strong>
                        Answer {optionLetter(optionIndex)} —{" "}
                        {question.options[optionIndex] || "Empty option"}
                      </strong>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={disabled || !passageSelection}
                        onClick={() => {
                          if (!passageSelection) return;
                          updateQuestion(index, {
                            ...question,
                            answerLocations: question.answerLocations.map(
                              (item, i) =>
                                i === optionIndex ? passageSelection : item
                            ),
                          });
                        }}
                      >
                        Use selected passage text
                      </button>
                      {location && (
                        <button
                          type="button"
                          className="test-editor-location-clear"
                          disabled={disabled}
                          onClick={() =>
                            updateQuestion(index, {
                              ...question,
                              answerLocations: question.answerLocations.map(
                                (item, i) => (i === optionIndex ? null : item)
                              ),
                            })
                          }
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {location ? (
                      <blockquote className="test-editor-location-quote">
                        <strong>
                          Paragraph {location.paragraphLabel || "?"}
                        </strong>
                        <span>“{location.text}”</span>
                      </blockquote>
                    ) : (
                      <p className="test-editor-location-empty">
                        No passage text mapped to answer{" "}
                        {optionLetter(optionIndex)}.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="test-editor-mcq-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={disabled}
              onClick={() =>
                updateQuestion(index, {
                  ...question,
                  options: [...question.options, ""],
                  answerLocations: [...question.answerLocations, null],
                })
              }
            >
              + Add option
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={disabled || set.questions.length <= 1}
              onClick={() => removeQuestion(index)}
            >
              Remove question
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={disabled}
        onClick={addQuestion}
      >
        + Add question
      </button>
    </div>
  );
}
