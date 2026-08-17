import { createClient } from "@/lib/supabase/client";
import type { MarkLessonCompletionResult } from "@/types/course";

export async function markLessonComplete(lessonId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("mark_lesson_complete", {
    target_lesson_id: lessonId,
  });

  if (error) throw error;

  const completion = (Array.isArray(data) ? data[0] : data) as
    | MarkLessonCompletionResult
    | null;
  if (!completion) throw new Error("Could not save lesson progress.");

  return completion;
}
