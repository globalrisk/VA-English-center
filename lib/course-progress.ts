export type ProgressSummary = {
  completed: number;
  total: number;
  percentage: number;
  isComplete: boolean;
  completedAt: string | null;
};

export function summarizeProgress(
  lessonIds: string[],
  completedLessonIds: ReadonlySet<string>,
  completedAt: string | null = null
): ProgressSummary {
  const completed = lessonIds.reduce(
    (count, lessonId) => count + (completedLessonIds.has(lessonId) ? 1 : 0),
    0
  );
  const total = lessonIds.length;

  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    isComplete: Boolean(completedAt) || (total > 0 && completed === total),
    completedAt,
  };
}
