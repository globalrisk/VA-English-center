"use client";

import { useLanguage, useTranslations } from "@/components/i18n/LanguageProvider";
import { localeTag } from "@/lib/i18n";
import type { ProgressSummary as Progress } from "@/lib/course-progress";

type Props = {
  progress: Progress;
  label?: string;
  compact?: boolean;
};

export function ProgressSummary({ progress, label = "Course progress", compact = false }: Props) {
  const t = useTranslations();
  const { locale } = useLanguage();
  if (progress.total === 0) {
    return <p className="progress-empty">{t("No lessons yet")}</p>;
  }

  return (
    <div className={`progress-summary${compact ? " progress-summary-compact" : ""}`}>
      <div className="progress-summary-copy">
        <span>{t(label)}</span>
        <strong>
          {progress.isComplete ? t("Completed") : t("{0} of {1} lessons", { 0: progress.completed, 1: progress.total })}
        </strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={t(label)}
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.completed}
      >
        <span style={{ width: `${progress.percentage}%` }} />
      </div>
      {progress.completedAt ? (
        <p className="progress-completed-date">
          {t("✓ Completed ")}{new Intl.DateTimeFormat(localeTag(locale), { dateStyle: "medium" }).format(new Date(progress.completedAt))}
        </p>
      ) : null}
    </div>
  );
}
