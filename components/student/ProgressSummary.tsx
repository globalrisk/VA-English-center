import type { ProgressSummary as Progress } from "@/lib/course-progress";

type Props = {
  progress: Progress;
  label?: string;
  compact?: boolean;
};

export function ProgressSummary({ progress, label = "Course progress", compact = false }: Props) {
  if (progress.total === 0) {
    return <p className="progress-empty">No lessons yet</p>;
  }

  return (
    <div className={`progress-summary${compact ? " progress-summary-compact" : ""}`}>
      <div className="progress-summary-copy">
        <span>{label}</span>
        <strong>
          {progress.isComplete ? "Completed" : `${progress.completed} of ${progress.total} lessons`}
        </strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.completed}
      >
        <span style={{ width: `${progress.percentage}%` }} />
      </div>
      {progress.completedAt ? (
        <p className="progress-completed-date">
          ✓ Completed {formatCompletionDate(progress.completedAt)}
        </p>
      ) : null}
    </div>
  );
}

function formatCompletionDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}
