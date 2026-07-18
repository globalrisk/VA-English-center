"use client";

import {
  countTestQuestions,
  emptyMultipleChoiceQuestion,
  emptyMultipleChoiceSet,
  emptyOptions,
  newQuestionSetId,
  optionLetter,
  type MultipleChoiceQuestion,
  type MultipleChoiceSet,
  type TestContent,
} from "@/lib/test-content";

type Props = {
  value: TestContent;
  disabled?: boolean;
  onChange: (value: TestContent) => void;
};

const MIN_OPTIONS = 2;

export function TestContentEditor({ value, disabled, onChange }: Props) {
  function patch(updates: Partial<TestContent>) {
    onChange({ ...value, ...updates });
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

  function updateSet(index: number, set: MultipleChoiceSet) {
    patch({
      questionSets: value.questionSets.map((item, i) => (i === index ? set : item)),
    });
  }

  function addSet() {
    const start = countTestQuestions(value) + 1;
    const set: MultipleChoiceSet = {
      ...emptyMultipleChoiceSet(start, 2),
      id: newQuestionSetId(),
    };
    patch({ questionSets: [...value.questionSets, set] });
  }

  function removeSet(index: number) {
    patch({ questionSets: value.questionSets.filter((_, i) => i !== index) });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="form-group">
        <label htmlFor="test-passage-title">Passage title</label>
        <input
          id="test-passage-title"
          type="text"
          value={value.passageTitle}
          disabled={disabled}
          placeholder="e.g. The History of the Bar Code"
          onChange={(e) => patch({ passageTitle: e.target.value })}
        />
      </div>

      <div>
        <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Passage paragraphs</p>
        <p className="age-group-picker-hint" style={{ marginBottom: "0.75rem" }}>
          Label paragraphs A, B, C… like an IELTS reading passage.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {value.paragraphs.map((paragraph, index) => (
            <div
              key={index}
              style={{
                padding: "0.75rem",
                border: "2px dashed var(--paper-dark)",
                borderRadius: "12px",
              }}
            >
              <div className="form-group" style={{ marginBottom: "0.5rem" }}>
                <label htmlFor={`para-label-${index}`}>Label</label>
                <input
                  id={`para-label-${index}`}
                  type="text"
                  value={paragraph.label}
                  disabled={disabled}
                  style={{ maxWidth: "6rem" }}
                  onChange={(e) => updateParagraph(index, "label", e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: "0.5rem" }}>
                <label htmlFor={`para-text-${index}`}>Text</label>
                <textarea
                  id={`para-text-${index}`}
                  value={paragraph.text}
                  disabled={disabled}
                  rows={5}
                  placeholder="Paragraph text…"
                  onChange={(e) => updateParagraph(index, "text", e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={disabled || value.paragraphs.length <= 1}
                onClick={() => removeParagraph(index)}
              >
                Remove paragraph
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ marginTop: "0.75rem" }}
          disabled={disabled}
          onClick={addParagraph}
        >
          + Add paragraph
        </button>
      </div>

      <div>
        <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Multiple-choice questions</p>
        <p className="age-group-picker-hint" style={{ marginBottom: "0.75rem" }}>
          Each question needs a prompt, at least two options, and one correct answer.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {value.questionSets.map((set, setIndex) => (
            <div
              key={set.id}
              style={{
                padding: "0.85rem",
                border: "2px solid var(--paper-dark)",
                borderRadius: "12px",
                background: "var(--paper)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                  alignItems: "center",
                }}
              >
                <span className="badge badge-yellow">Multiple choice</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={disabled}
                  onClick={() => removeSet(setIndex)}
                >
                  Remove set
                </button>
              </div>

              <div className="form-group">
                <label>Range label</label>
                <input
                  type="text"
                  value={set.rangeLabel}
                  disabled={disabled}
                  onChange={(e) =>
                    updateSet(setIndex, { ...set, rangeLabel: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Instructions</label>
                <textarea
                  value={set.instruction}
                  disabled={disabled}
                  rows={2}
                  onChange={(e) =>
                    updateSet(setIndex, { ...set, instruction: e.target.value })
                  }
                />
              </div>

              <MultipleChoiceQuestionsEditor
                set={set}
                disabled={disabled}
                onChange={(next) => updateSet(setIndex, next)}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ marginTop: "0.75rem" }}
          disabled={disabled}
          onClick={addSet}
        >
          + Add question set
        </button>
      </div>
    </div>
  );
}

function MultipleChoiceQuestionsEditor({
  set,
  disabled,
  onChange,
}: {
  set: MultipleChoiceSet;
  disabled?: boolean;
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
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {set.questions.map((question, index) => (
        <div
          key={`${set.id}-q-${index}`}
          style={{
            padding: "0.65rem",
            border: "1px dashed var(--paper-dark)",
            borderRadius: "10px",
          }}
        >
          <div
            className="form-group"
            style={{
              marginBottom: "0.5rem",
              display: "grid",
              gridTemplateColumns: "4rem 1fr",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <label>No.</label>
            <input
              type="number"
              min={1}
              value={question.number}
              disabled={disabled}
              onChange={(e) =>
                updateQuestion(index, {
                  ...question,
                  number: Number(e.target.value) || 1,
                })
              }
            />
          </div>

          <div className="form-group" style={{ marginBottom: "0.5rem" }}>
            <label>Question</label>
            <textarea
              value={question.prompt}
              disabled={disabled}
              rows={2}
              placeholder="Question about the passage…"
              onChange={(e) =>
                updateQuestion(index, { ...question, prompt: e.target.value })
              }
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {question.options.map((option, optionIndex) => (
              <div
                key={optionIndex}
                className="form-group"
                style={{
                  marginBottom: 0,
                  display: "grid",
                  gridTemplateColumns: "2rem 1fr auto",
                  gap: "0.5rem",
                  alignItems: "center",
                }}
              >
                <label htmlFor={`opt-${set.id}-${index}-${optionIndex}`}>
                  {optionLetter(optionIndex)}
                </label>
                <input
                  id={`opt-${set.id}-${index}-${optionIndex}`}
                  type="text"
                  value={option}
                  disabled={disabled}
                  placeholder={`Option ${optionLetter(optionIndex)}`}
                  onChange={(e) =>
                    updateQuestion(index, {
                      ...question,
                      options: question.options.map((opt, i) =>
                        i === optionIndex ? e.target.value : opt
                      ),
                    })
                  }
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={disabled || question.options.length <= MIN_OPTIONS}
                  onClick={() => {
                    const nextOptions = question.options.filter((_, i) => i !== optionIndex);
                    let correctOptionIndex = question.correctOptionIndex;
                    if (optionIndex === correctOptionIndex) correctOptionIndex = 0;
                    else if (optionIndex < correctOptionIndex) correctOptionIndex -= 1;
                    updateQuestion(index, {
                      ...question,
                      options: nextOptions.length >= MIN_OPTIONS ? nextOptions : emptyOptions(MIN_OPTIONS),
                      correctOptionIndex: Math.min(
                        correctOptionIndex,
                        Math.max(nextOptions.length - 1, 0)
                      ),
                    });
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="form-group" style={{ marginTop: "0.65rem", marginBottom: "0.5rem" }}>
            <label>Correct answer</label>
            <select
              value={question.correctOptionIndex}
              disabled={disabled}
              onChange={(e) =>
                updateQuestion(index, {
                  ...question,
                  correctOptionIndex: Number(e.target.value) || 0,
                })
              }
            >
              {question.options.map((option, optionIndex) => (
                <option key={optionIndex} value={optionIndex}>
                  {optionLetter(optionIndex)}
                  {option.trim() ? ` — ${option.trim()}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={disabled}
              onClick={() =>
                updateQuestion(index, {
                  ...question,
                  options: [...question.options, ""],
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
