"use client";

import { TestContentEditor } from "@/components/admin/TestContentEditor";
import { ReadingTestPlayer } from "@/components/student/ReadingTestPlayer";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { createClient } from "@/lib/supabase/client";
import {
  countTestQuestions,
  normalizeTestContent,
  sanitizeTestContent,
  validateTestContent,
  type TestContent,
} from "@/lib/test-content";
import type { Lesson, TestAttempt } from "@/types/course";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  lesson: Lesson;
  isAdmin?: boolean;
  initialAttempt?: TestAttempt | null;
};

export function TestLessonEditor({
  lesson,
  isAdmin = false,
  initialAttempt = null,
}: Props) {
  const router = useRouter();
  const [savedContent, setSavedContent] = useState(() =>
    normalizeTestContent(lesson.test_content)
  );
  const [mode, setMode] = useState<"play" | "edit">("play");
  const [draft, setDraft] = useState<TestContent>(savedContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [playerKey, setPlayerKey] = useState(0);

  useEffect(() => {
    setSavedContent(normalizeTestContent(lesson.test_content));
  }, [lesson.test_content]);

  const hasTestContent =
    Boolean(savedContent.passageTitle.trim()) &&
    savedContent.paragraphs.some((p) => p.text.trim()) &&
    countTestQuestions(savedContent) > 0;

  function startEdit() {
    setDraft(savedContent);
    setError(null);
    setMessage(null);
    setMode("edit");
  }

  function cancelEdit() {
    setDraft(savedContent);
    setError(null);
    setMessage(null);
    setMode("play");
  }

  async function handleSave() {
    setError(null);
    setMessage(null);

    const validationError = validateTestContent(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      // sanitizeTestContent already renumbers after dropping incomplete questions
      const sanitized = sanitizeTestContent(draft);
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("admin_update_lesson", {
        lesson_id: lesson.id,
        lesson_unit_id: lesson.unit_id,
        lesson_title: lesson.title,
        lesson_content: lesson.content ?? null,
        lesson_image_url: null,
        lesson_video_url: null,
        lesson_order_index: lesson.order_index,
        lesson_type: "test",
        lesson_embed_url: null,
        lesson_game_cards: [],
        lesson_builtin_game: null,
        lesson_test_content: sanitized,
      });

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      setSavedContent(sanitized);
      setDraft(sanitized);
      setMessage("Test saved.");
      setPlayerKey((key) => key + 1);
      setMode("play");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save test. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {isAdmin && (
        <div className="test-lesson-editor-bar">
          <div className="test-lesson-editor-bar-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={mode === "play" ? "is-active" : ""}
              disabled={saving}
              onClick={() => {
                if (mode === "edit") cancelEdit();
              }}
            >
              Preview
            </button>
            <button
              type="button"
              className={mode === "edit" ? "is-active" : ""}
              disabled={saving}
              onClick={() => {
                if (mode === "play") startEdit();
              }}
            >
              Edit
            </button>
          </div>

          {mode === "edit" && (
            <>
              <button
                type="button"
                className="btn btn-primary btn-sm btn-loading"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Saving…
                  </>
                ) : (
                  "Save test"
                )}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={saving}
                onClick={cancelEdit}
              >
                Cancel
              </button>
            </>
          )}

          {error && (
            <p className="test-lesson-editor-bar-msg is-error">{error}</p>
          )}
          {!error && message && mode === "play" && (
            <p className="test-lesson-editor-bar-msg is-ok">{message}</p>
          )}
        </div>
      )}

      {mode === "edit" ? (
        <TestContentEditor
          value={draft}
          disabled={saving}
          fullHeight
          onChange={setDraft}
        />
      ) : hasTestContent ? (
        <ReadingTestPlayer
          key={playerKey}
          lessonId={lesson.id}
          content={savedContent}
          isAdmin={isAdmin}
          initialAttempt={initialAttempt}
        />
      ) : (
        <p style={{ color: "var(--ink-light)", fontFamily: "var(--font-hand)" }}>
          This test is not ready yet.
          {isAdmin ? " Switch to Edit to add a passage and questions." : ""}
        </p>
      )}
    </div>
  );
}
