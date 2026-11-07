"use client";

import { useTranslations } from "@/components/i18n/LanguageProvider";
import type { TestAttempt } from "@/types/course";

export type AttemptWithLesson = TestAttempt & {
  lessons: {
    title: string;
    courses: { title: string };
  };
};

type TestScoresGridProps = {
  attempts: AttemptWithLesson[];
};

export function TestScoresGrid({ attempts }: TestScoresGridProps) {
  const t = useTranslations();
  if (attempts.length === 0) {
    return <p className="section-sub">{t("No submitted test scores yet.")}</p>;
  }

  return (
    <div className="course-grid">
      {attempts.map((attempt) => (
        <article
          key={attempt.id}
          className="course-card student-test-score-card"
          data-color="yellow"
        >
          <p className="student-test-score-course">{attempt.lessons.courses.title}</p>
          <h3>{attempt.lessons.title}</h3>
          <p className="student-test-score-value">
            {attempt.correct_count}/{attempt.total_questions} ({formatPercentage(attempt.percentage)}%)
          </p>
        </article>
      ))}
    </div>
  );
}

function formatPercentage(value: number | null) {
  const numeric = Number(value ?? 0);
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2);
}
