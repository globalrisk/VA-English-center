export type TestParagraph = {
  label: string;
  text: string;
};

/** single = one correct answer; multiple = one or more correct answers */
export type ChoiceMode = "single" | "multiple";

export type QuestionPassageLocation = {
  paragraphLabel: string;
  text: string;
};

export type MultipleChoiceQuestion = {
  number: number;
  prompt: string;
  options: string[];
  choiceMode: ChoiceMode;
  correctOptionIndexes: number[];
  /** Admin-authored answer explanation shown after the student finishes */
  explanation: string;
  /** Option-aligned passage excerpts; correct options require a mapping */
  answerLocations: Array<QuestionPassageLocation | null>;
};

export type MultipleChoiceSet = {
  id: string;
  type: "multiple_choice";
  rangeLabel: string;
  instruction: string;
  questions: MultipleChoiceQuestion[];
};

export type TestQuestionSet = MultipleChoiceSet;

export type TestContent = {
  passageTitle: string;
  timeLimitMinutes: number;
  paragraphs: TestParagraph[];
  questionSets: TestQuestionSet[];
};

const DEFAULT_OPTION_COUNT = 4;
const MIN_OPTIONS = 2;
export const DEFAULT_TEST_TIME_LIMIT_MINUTES = 30;
export const MAX_TEST_TIME_LIMIT_MINUTES = 240;

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function newQuestionSetId(): string {
  return cryptoRandomId();
}

export function emptyOptions(count = DEFAULT_OPTION_COUNT): string[] {
  return Array.from({ length: count }, () => "");
}

export function emptyMultipleChoiceQuestion(number = 1): MultipleChoiceQuestion {
  return {
    number,
    prompt: "",
    options: emptyOptions(),
    choiceMode: "single",
    correctOptionIndexes: [0],
    explanation: "",
    answerLocations: Array.from({ length: DEFAULT_OPTION_COUNT }, () => null),
  };
}

export function emptyMultipleChoiceSet(
  startNumber = 1,
  questionCount = 2
): MultipleChoiceSet {
  return {
    id: cryptoRandomId(),
    type: "multiple_choice",
    rangeLabel: `Questions ${startNumber} - ${startNumber + questionCount - 1}`,
    instruction: "",
    questions: Array.from({ length: questionCount }, (_, i) =>
      emptyMultipleChoiceQuestion(startNumber + i)
    ),
  };
}

const DEFAULT_SET_INSTRUCTION = "Choose the correct answer for each question.";

/** Collapse any number of sets into one flat question list (sets are unused for now). */
export function ensureSingleQuestionSet(content: TestContent): MultipleChoiceSet {
  const sets = content.questionSets.filter((set) => set.type === "multiple_choice");
  if (sets.length === 0) {
    return emptyMultipleChoiceSet(1, 2);
  }

  if (sets.length === 1) {
    return sets[0];
  }

  const questions = sets.flatMap((set) => set.questions);
  const instruction =
    sets.find(
      (set) =>
        set.instruction.trim() &&
        set.instruction.trim() !== DEFAULT_SET_INSTRUCTION
    )?.instruction ?? "";

  return {
    id: sets[0].id || cryptoRandomId(),
    type: "multiple_choice",
    rangeLabel: "Questions",
    instruction,
    questions: questions.length > 0 ? questions : [emptyMultipleChoiceQuestion(1)],
  };
}

export function withSingleQuestionSet(
  content: TestContent,
  set: MultipleChoiceSet
): TestContent {
  return renumberTestContent({
    ...content,
    questionSets: [set],
  });
}

export function emptyTestContent(): TestContent {
  return {
    passageTitle: "",
    timeLimitMinutes: DEFAULT_TEST_TIME_LIMIT_MINUTES,
    paragraphs: [{ label: "A", text: "" }],
    questionSets: [emptyMultipleChoiceSet(1, 2)],
  };
}

export function normalizeTestContent(raw: unknown): TestContent {
  if (!raw || typeof raw !== "object") return emptyTestContent();
  const data = raw as Partial<TestContent>;

  const paragraphs = Array.isArray(data.paragraphs)
    ? data.paragraphs.map((p, i) => ({
        label: String((p as TestParagraph)?.label ?? String.fromCharCode(65 + i)),
        text: String((p as TestParagraph)?.text ?? ""),
      }))
    : [{ label: "A", text: "" }];

  const rawQuestionSets = Array.isArray(data.questionSets) ? data.questionSets : null;
  const questionSets = rawQuestionSets
    ? (rawQuestionSets.map(normalizeQuestionSet).filter(Boolean) as TestQuestionSet[])
    : [];

  const normalized: TestContent = {
    passageTitle: String(data.passageTitle ?? ""),
    timeLimitMinutes: normalizeTimeLimit(data.timeLimitMinutes),
    paragraphs: paragraphs.length > 0 ? paragraphs : [{ label: "A", text: "" }],
    // Keep empty when legacy note_completion / TFNG sets were dropped so
    // students see "not ready" until admins add questions.
    questionSets:
      questionSets.length > 0
        ? questionSets
        : rawQuestionSets
          ? []
          : [emptyMultipleChoiceSet(1, 2)],
  };

  // Question sets are unused for now — always collapse to one list.
  if (normalized.questionSets.length === 0) return normalized;
  return withSingleQuestionSet(normalized, ensureSingleQuestionSet(normalized));
}

function normalizeTimeLimit(raw: unknown): number {
  const minutes = Number(raw);
  if (!Number.isInteger(minutes) || minutes < 1) {
    return DEFAULT_TEST_TIME_LIMIT_MINUTES;
  }
  return Math.min(minutes, MAX_TEST_TIME_LIMIT_MINUTES);
}

function normalizeQuestionSet(raw: unknown): TestQuestionSet | null {
  if (!raw || typeof raw !== "object") return null;
  const set = raw as Partial<MultipleChoiceSet> & { type?: string };

  // Legacy note_completion / true_false_not_given sets are dropped.
  if (set.type && set.type !== "multiple_choice") return null;

  const questions = Array.isArray(set.questions)
    ? set.questions.map((q, i) => normalizeQuestion(q, i + 1))
    : [emptyMultipleChoiceQuestion(1)];

  return {
    id: String(set.id || cryptoRandomId()),
    type: "multiple_choice",
    rangeLabel: String(set.rangeLabel ?? "Questions"),
    instruction: String(set.instruction ?? ""),
    questions: questions.length > 0 ? questions : [emptyMultipleChoiceQuestion(1)],
  };
}

function normalizeChoiceMode(raw: unknown): ChoiceMode {
  return raw === "multiple" ? "multiple" : "single";
}

function normalizeCorrectIndexes(
  raw: Partial<MultipleChoiceQuestion> & { correctOptionIndex?: unknown },
  optionCount: number
): number[] {
  if (Array.isArray(raw.correctOptionIndexes)) {
    const indexes = raw.correctOptionIndexes
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n >= 0 && n < optionCount);
    const unique = [...new Set(indexes)].sort((a, b) => a - b);
    if (unique.length > 0) return unique;
  }

  // Legacy single-answer field
  const legacy = Number(raw.correctOptionIndex);
  if (Number.isInteger(legacy) && legacy >= 0 && legacy < optionCount) {
    return [legacy];
  }

  return [0];
}

function normalizeQuestion(raw: unknown, fallbackNumber: number): MultipleChoiceQuestion {
  const q = (raw ?? {}) as Partial<MultipleChoiceQuestion> & {
    correctOptionIndex?: unknown;
    passageLocation?: unknown;
  };
  const options = Array.isArray(q.options)
    ? q.options.map((opt) => String(opt ?? ""))
    : emptyOptions();

  while (options.length < MIN_OPTIONS) options.push("");

  const choiceMode = normalizeChoiceMode(q.choiceMode);
  let correctOptionIndexes = normalizeCorrectIndexes(q, options.length);

  if (choiceMode === "single") {
    correctOptionIndexes = [correctOptionIndexes[0] ?? 0];
  }

  const answerLocations = Array.isArray(q.answerLocations)
    ? q.answerLocations
        .slice(0, options.length)
        .map((location) => normalizePassageLocation(location))
    : [];
  while (answerLocations.length < options.length) answerLocations.push(null);

  // Migrate the previous one-location-per-question format to each correct answer.
  const legacyLocation = normalizePassageLocation(q.passageLocation);
  if (legacyLocation) {
    for (const correctIndex of correctOptionIndexes) {
      answerLocations[correctIndex] ??= legacyLocation;
    }
  }

  return {
    number: Number(q.number) || fallbackNumber,
    prompt: String(q.prompt ?? ""),
    options,
    choiceMode,
    correctOptionIndexes,
    explanation: String(q.explanation ?? ""),
    answerLocations,
  };
}

function normalizePassageLocation(raw: unknown): QuestionPassageLocation | null {
  if (!raw || typeof raw !== "object") return null;
  const location = raw as Partial<QuestionPassageLocation>;
  const text = String(location.text ?? "");
  if (!text.trim()) return null;
  return {
    paragraphLabel: String(location.paragraphLabel ?? ""),
    text,
  };
}

export function countTestQuestions(content: TestContent): number {
  return content.questionSets.reduce((total, set) => total + set.questions.length, 0);
}

export function rangeLabelForQuestions(start: number, end: number): string {
  if (start === end) return `Question ${start}`;
  return `Questions ${start} - ${end}`;
}

/** Assign contiguous 1..N numbers and derived range labels across all sets. */
export function renumberTestContent(content: TestContent): TestContent {
  let nextNumber = 1;

  const questionSets = content.questionSets.map((set) => {
    const questions = set.questions.map((question) => {
      const numbered = { ...question, number: nextNumber };
      nextNumber += 1;
      return numbered;
    });

    const start = questions[0]?.number ?? nextNumber;
    const end = questions[questions.length - 1]?.number ?? start;

    return {
      ...set,
      type: "multiple_choice" as const,
      rangeLabel: questions.length > 0 ? rangeLabelForQuestions(start, end) : "Questions",
      questions,
    };
  });

  return { ...content, questionSets };
}

export function isOptionCorrect(
  question: MultipleChoiceQuestion,
  optionIndex: number
): boolean {
  return question.correctOptionIndexes.includes(optionIndex);
}

export function sameAnswerSet(selected: number[], correct: number[]): boolean {
  if (selected.length !== correct.length) return false;
  const a = [...selected].sort((x, y) => x - y);
  const b = [...correct].sort((x, y) => x - y);
  return a.every((value, i) => value === b[i]);
}

export function formatCorrectAnswers(question: MultipleChoiceQuestion): string {
  return question.correctOptionIndexes
    .slice()
    .sort((a, b) => a - b)
    .map((index) => {
      const text = question.options[index]?.trim() ?? "";
      return text
        ? `${optionLetter(index)} — ${text}`
        : optionLetter(index);
    })
    .join("; ");
}

export function setQuestionChoiceMode(
  question: MultipleChoiceQuestion,
  choiceMode: ChoiceMode
): MultipleChoiceQuestion {
  const indexes = question.correctOptionIndexes.length
    ? question.correctOptionIndexes
    : [0];

  if (choiceMode === "single") {
    return {
      ...question,
      choiceMode,
      correctOptionIndexes: [indexes[0] ?? 0],
    };
  }

  return {
    ...question,
    choiceMode,
    correctOptionIndexes: indexes,
  };
}

export function toggleCorrectOption(
  question: MultipleChoiceQuestion,
  optionIndex: number
): MultipleChoiceQuestion {
  if (question.choiceMode === "single") {
    return { ...question, correctOptionIndexes: [optionIndex] };
  }

  const has = question.correctOptionIndexes.includes(optionIndex);
  let next = has
    ? question.correctOptionIndexes.filter((i) => i !== optionIndex)
    : [...question.correctOptionIndexes, optionIndex].sort((a, b) => a - b);

  // Always keep at least one correct option marked.
  if (next.length === 0) next = [optionIndex];

  return { ...question, correctOptionIndexes: next };
}

export function remapCorrectIndexesAfterOptionRemoval(
  question: MultipleChoiceQuestion,
  removedIndex: number
): number[] {
  const remapped = question.correctOptionIndexes
    .filter((i) => i !== removedIndex)
    .map((i) => (i > removedIndex ? i - 1 : i));

  if (remapped.length > 0) return remapped;
  return [0];
}

export function validateTestContent(content: TestContent): string | null {
  if (!content.passageTitle.trim()) return "Test lessons need a passage title.";
  if (
    !Number.isInteger(content.timeLimitMinutes) ||
    content.timeLimitMinutes < 1 ||
    content.timeLimitMinutes > MAX_TEST_TIME_LIMIT_MINUTES
  ) {
    return `Set a test time limit between 1 and ${MAX_TEST_TIME_LIMIT_MINUTES} minutes.`;
  }
  const paragraphs = content.paragraphs.filter((p) => p.text.trim());
  if (paragraphs.length < 1) return "Add at least one passage paragraph.";

  const set = ensureSingleQuestionSet(content);
  if (set.questions.filter((q) => q.prompt.trim()).length < 1) {
    return "Add at least one question.";
  }

  for (const question of set.questions) {
    if (!question.prompt.trim()) continue;

    const filledOptions = question.options
      .map((opt, index) => ({ opt: opt.trim(), index }))
      .filter((item) => item.opt);

    if (filledOptions.length < MIN_OPTIONS) {
      return `Question ${question.number} needs at least ${MIN_OPTIONS} answer options.`;
    }

    const correctFilled = question.correctOptionIndexes.filter((index) =>
      Boolean(question.options[index]?.trim())
    );

    if (correctFilled.length < 1) {
      return `Question ${question.number} needs a correct answer selected.`;
    }

    if (question.choiceMode === "single" && correctFilled.length !== 1) {
      return `Question ${question.number} is single choice and needs exactly one correct answer.`;
    }

    for (const correctIndex of correctFilled) {
      const location = question.answerLocations[correctIndex];
      const answerLabel = optionLetter(correctIndex);
      if (!location?.text.trim() || !location.paragraphLabel.trim()) {
        return `Question ${question.number} answer ${answerLabel} needs a mapped passage location.`;
      }

      const locationStillExists = paragraphs.some(
        (paragraph) =>
          paragraph.label.trim() === location.paragraphLabel.trim() &&
          paragraph.text.includes(location.text)
      );
      if (!locationStillExists) {
        return `Question ${question.number} answer ${answerLabel}'s mapped text no longer exists in paragraph ${location.paragraphLabel}. Map it again.`;
      }
    }
  }

  return null;
}

export function sanitizeTestContent(content: TestContent): TestContent {
  const set = ensureSingleQuestionSet(content);
  const questions = set.questions
    .map((q) => {
      const kept = q.options
        .map((opt, index) => ({ opt: opt.trim(), index }))
        .filter((item) => item.opt);

      if (kept.length < MIN_OPTIONS || !q.prompt.trim()) return null;

      const options = kept.map((item) => item.opt);
      const oldToNew = new Map(kept.map((item, newIndex) => [item.index, newIndex]));

      let correctOptionIndexes = q.correctOptionIndexes
        .map((oldIndex) => oldToNew.get(oldIndex))
        .filter((n): n is number => n !== undefined);

      correctOptionIndexes = [...new Set(correctOptionIndexes)].sort((a, b) => a - b);

      const choiceMode = q.choiceMode === "multiple" ? "multiple" : "single";
      if (choiceMode === "single") {
        correctOptionIndexes = [correctOptionIndexes[0] ?? 0];
      } else if (correctOptionIndexes.length < 1) {
        correctOptionIndexes = [0];
      }

      const correctSet = new Set(correctOptionIndexes);
      const answerLocations = kept.map((item, newIndex) => {
        if (!correctSet.has(newIndex)) return null;
        const location = q.answerLocations[item.index];
        return location?.text.trim()
          ? {
              paragraphLabel: location.paragraphLabel.trim(),
              text: location.text.trim(),
            }
          : null;
      });

      return {
        number: q.number,
        prompt: q.prompt.trim(),
        options,
        choiceMode,
        correctOptionIndexes,
        explanation: q.explanation.trim(),
        answerLocations,
      };
    })
    .filter(Boolean) as MultipleChoiceQuestion[];

  return withSingleQuestionSet(
    {
      passageTitle: content.passageTitle.trim(),
      timeLimitMinutes: normalizeTimeLimit(content.timeLimitMinutes),
      paragraphs: content.paragraphs
        .map((p) => ({ label: p.label.trim() || "A", text: p.text.trim() }))
        .filter((p) => p.text),
      questionSets: [],
    },
    {
      ...set,
      type: "multiple_choice",
      instruction: "",
      questions,
    }
  );
}

export function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}
