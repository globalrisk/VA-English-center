export type TestParagraph = {
  label: string;
  text: string;
};

export type MultipleChoiceQuestion = {
  number: number;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
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
  paragraphs: TestParagraph[];
  questionSets: TestQuestionSet[];
};

const DEFAULT_OPTION_COUNT = 4;
const MIN_OPTIONS = 2;

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
    correctOptionIndex: 0,
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
    instruction: "Choose the correct answer for each question.",
    questions: Array.from({ length: questionCount }, (_, i) =>
      emptyMultipleChoiceQuestion(startNumber + i)
    ),
  };
}

export function emptyTestContent(): TestContent {
  return {
    passageTitle: "",
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

  return {
    passageTitle: String(data.passageTitle ?? ""),
    paragraphs: paragraphs.length > 0 ? paragraphs : [{ label: "A", text: "" }],
    // Keep empty when legacy note_completion / TFNG sets were dropped so
    // students see "not ready" until admins add multiple-choice questions.
    questionSets:
      questionSets.length > 0
        ? questionSets
        : rawQuestionSets
          ? []
          : [emptyMultipleChoiceSet(1, 2)],
  };
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
    instruction: String(set.instruction ?? "Choose the correct answer for each question."),
    questions: questions.length > 0 ? questions : [emptyMultipleChoiceQuestion(1)],
  };
}

function normalizeQuestion(raw: unknown, fallbackNumber: number): MultipleChoiceQuestion {
  const q = (raw ?? {}) as Partial<MultipleChoiceQuestion>;
  const options = Array.isArray(q.options)
    ? q.options.map((opt) => String(opt ?? ""))
    : emptyOptions();

  while (options.length < MIN_OPTIONS) options.push("");

  const correctOptionIndex = Number(q.correctOptionIndex);
  const safeIndex =
    Number.isInteger(correctOptionIndex) &&
    correctOptionIndex >= 0 &&
    correctOptionIndex < options.length
      ? correctOptionIndex
      : 0;

  return {
    number: Number(q.number) || fallbackNumber,
    prompt: String(q.prompt ?? ""),
    options,
    correctOptionIndex: safeIndex,
  };
}

export function countTestQuestions(content: TestContent): number {
  return content.questionSets.reduce((total, set) => total + set.questions.length, 0);
}

export function validateTestContent(content: TestContent): string | null {
  if (!content.passageTitle.trim()) return "Test lessons need a passage title.";
  const paragraphs = content.paragraphs.filter((p) => p.text.trim());
  if (paragraphs.length < 1) return "Add at least one passage paragraph.";

  if (content.questionSets.length < 1) return "Add at least one question set.";

  for (const set of content.questionSets) {
    const questions = set.questions.filter((q) => q.prompt.trim());
    if (questions.length < 1) {
      return "Multiple-choice sets need at least one question.";
    }

    for (const question of set.questions) {
      if (!question.prompt.trim()) continue;

      const filledOptions = question.options
        .map((opt, index) => ({ opt: opt.trim(), index }))
        .filter((item) => item.opt);

      if (filledOptions.length < MIN_OPTIONS) {
        return `Question ${question.number} needs at least ${MIN_OPTIONS} answer options.`;
      }

      const correctText = question.options[question.correctOptionIndex]?.trim();
      if (!correctText) {
        return `Question ${question.number} needs a correct answer selected.`;
      }
    }
  }

  return null;
}

export function sanitizeTestContent(content: TestContent): TestContent {
  return {
    passageTitle: content.passageTitle.trim(),
    paragraphs: content.paragraphs
      .map((p) => ({ label: p.label.trim() || "A", text: p.text.trim() }))
      .filter((p) => p.text),
    questionSets: content.questionSets.map((set) => {
      const questions = set.questions
        .map((q) => {
          const options = q.options.map((opt) => opt.trim()).filter(Boolean);
          if (options.length < MIN_OPTIONS || !q.prompt.trim()) return null;

          const originalCorrect = q.options[q.correctOptionIndex]?.trim() ?? "";
          let correctOptionIndex = options.findIndex((opt) => opt === originalCorrect);
          if (correctOptionIndex < 0) correctOptionIndex = 0;

          return {
            number: q.number,
            prompt: q.prompt.trim(),
            options,
            correctOptionIndex,
          };
        })
        .filter(Boolean) as MultipleChoiceQuestion[];

      return {
        ...set,
        type: "multiple_choice" as const,
        rangeLabel: set.rangeLabel.trim() || "Questions",
        instruction: set.instruction.trim() || "Choose the correct answer for each question.",
        questions,
      };
    }),
  };
}

export function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}
