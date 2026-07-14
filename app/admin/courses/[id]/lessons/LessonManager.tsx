"use client";

import { GameCardsEditor } from "@/components/admin/GameCardsEditor";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { createClient } from "@/lib/supabase/client";
import {
  BUILTIN_GAMES,
  builtinGameLabel,
  minCardsForBuiltinGame,
  type BuiltinGame,
} from "@/lib/builtin-games";
import { LESSON_TYPES, lessonTypeLabel, type LessonType } from "@/lib/lesson-types";
import { unitKindLabel } from "@/lib/units";
import type { GameCard, Lesson, Unit } from "@/types/course";
import { useRouter } from "next/navigation";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";

type Props = {
  courseId: string;
  units: Unit[];
  lessons: Lesson[];
};

function normalizeGameCards(raw: unknown): GameCard[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ term: "", definition: "" }, { term: "", definition: "" }];
  }
  return raw.map((item) => {
    const card = item as Partial<GameCard>;
    return {
      term: String(card.term ?? ""),
      definition: String(card.definition ?? ""),
    };
  });
}

function validGameCards(cards: GameCard[]): GameCard[] {
  return cards.filter((c) => c.term.trim() && c.definition.trim());
}

type GameSource = "builtin" | "quizlet";

type LessonForm = {
  title: string;
  content: string;
  orderIndex: string;
  unitId: string;
  lessonType: LessonType;
  gameSource: GameSource;
  embedUrl: string;
  builtinGame: BuiltinGame;
  gameCards: GameCard[];
};

function emptyForm(defaultUnitId: string): LessonForm {
  return {
    title: "",
    content: "",
    orderIndex: "",
    unitId: defaultUnitId,
    lessonType: "game",
    gameSource: "builtin",
    embedUrl: "",
    builtinGame: "flashcards",
    gameCards: [{ term: "", definition: "" }, { term: "", definition: "" }],
  };
}

function validateLessonForm(form: LessonForm): string | null {
  if (!form.title.trim()) return "Title is required.";
  if (!form.unitId) return "Unit is required.";

  if (form.lessonType === "game") {
    const cards = validGameCards(form.gameCards);
    if (form.gameSource === "quizlet") {
      if (!form.embedUrl.trim()) return "Quizlet lessons need an embed URL.";
    } else {
      const minCards = minCardsForBuiltinGame(form.builtinGame);
      if (cards.length < minCards) {
        const label = builtinGameLabel(form.builtinGame);
        return `${label} needs at least ${minCards} flashcards with both term and definition filled in.`;
      }
    }
  }

  return null;
}

function rpcPayload(form: LessonForm, orderIndex: number | null) {
  const cards = validGameCards(form.gameCards);
  const useQuizlet = form.lessonType === "game" && form.gameSource === "quizlet";
  return {
    lesson_unit_id: form.unitId,
    lesson_title: form.title.trim(),
    lesson_content: form.content.trim() || null,
    lesson_image_url: null,
    lesson_video_url: null,
    lesson_order_index: orderIndex,
    lesson_type: form.lessonType,
    lesson_embed_url: useQuizlet ? form.embedUrl.trim() : null,
    lesson_game_cards: form.lessonType === "game" ? cards : [],
    lesson_builtin_game:
      form.lessonType === "game" && !useQuizlet ? form.builtinGame : null,
  };
}

export function LessonManager({ courseId, units, lessons }: Props) {
  const router = useRouter();
  const sortedUnits = useMemo(
    () => [...units].sort((a, b) => a.order_index - b.order_index),
    [units]
  );
  const defaultUnitId =
    sortedUnits.find((u) => u.kind === "vocabulary")?.id ?? sortedUnits[0]?.id ?? "";

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [newLesson, setNewLesson] = useState<LessonForm>(() => emptyForm(defaultUnitId));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LessonForm>(() => emptyForm(defaultUnitId));

  function lessonToForm(lesson: Lesson): LessonForm {
    const hasQuizlet = Boolean(lesson.embed_url?.trim());
    return {
      title: lesson.title,
      content: lesson.content ?? "",
      orderIndex: String(lesson.order_index),
      unitId: lesson.unit_id,
      lessonType: lesson.lesson_type ?? "game",
      gameSource: hasQuizlet ? "quizlet" : "builtin",
      embedUrl: lesson.embed_url ?? "",
      builtinGame: lesson.builtin_game ?? "flashcards",
      gameCards: normalizeGameCards(lesson.game_cards),
    };
  }

  function startEdit(lesson: Lesson) {
    setEditingId(lesson.id);
    setEditForm(lessonToForm(lesson));
    setMessage(null);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm(defaultUnitId));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const validationError = validateLessonForm(newLesson);
    if (validationError) {
      setError(validationError);
      return;
    }

    setCreating(true);

    try {
      const orderValue = newLesson.orderIndex.trim();
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("admin_create_lesson", {
        p_course_id: courseId,
        ...rpcPayload(newLesson, orderValue ? Number(orderValue) : null),
      });

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      setMessage(`Created lesson "${newLesson.title.trim()}".`);
      setNewLesson(emptyForm(defaultUnitId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create lesson. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(lessonId: string) {
    setMessage(null);
    setError(null);

    const validationError = validateLessonForm(editForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    const orderIndex = Number(editForm.orderIndex);
    if (!Number.isFinite(orderIndex) || orderIndex < 1) {
      setError("Order must be a positive number.");
      return;
    }

    setPendingId(lessonId);

    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("admin_update_lesson", {
        lesson_id: lessonId,
        ...rpcPayload(editForm, orderIndex),
      });

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      setMessage(`Updated "${editForm.title.trim()}".`);
      cancelEdit();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save lesson. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(lesson: Lesson) {
    const confirmed = window.confirm(`Delete lesson "${lesson.title}"? This cannot be undone.`);
    if (!confirmed) return;

    setMessage(null);
    setError(null);
    setPendingId(lesson.id);

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("admin_delete_lesson", {
      lesson_id: lesson.id,
    });

    setPendingId(null);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    if (editingId === lesson.id) cancelEdit();
    setMessage(`Deleted "${lesson.title}".`);
    router.refresh();
  }

  function renderTypeFields(
    form: LessonForm,
    setForm: Dispatch<SetStateAction<LessonForm>>,
    idPrefix: string,
    disabled?: boolean
  ) {
    const patch = (updates: Partial<LessonForm>) =>
      setForm((prev) => ({ ...prev, ...updates }));

    return (
      <>
        <div className="form-group">
          <label htmlFor={`${idPrefix}-unit`}>Unit</label>
          <select
            id={`${idPrefix}-unit`}
            value={form.unitId}
            disabled={disabled}
            onChange={(e) => patch({ unitId: e.target.value })}
          >
            {sortedUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unitKindLabel(unit.kind)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor={`${idPrefix}-type`}>Lesson type</label>
          <select
            id={`${idPrefix}-type`}
            value={form.lessonType}
            disabled={disabled}
            onChange={(e) => patch({ lessonType: e.target.value as LessonType })}
          >
            {LESSON_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label} — {type.description}
              </option>
            ))}
          </select>
        </div>

        {form.lessonType === "game" && (
          <>
            <div className="form-group">
              <span>Game source</span>
              <div className="flashcard-mode-tabs" style={{ marginTop: "0.35rem" }}>
                <button
                  type="button"
                  className={`btn btn-sm ${form.gameSource === "builtin" ? "btn-primary" : "btn-secondary"}`}
                  disabled={disabled}
                  onClick={() => patch({ gameSource: "builtin", embedUrl: "" })}
                >
                  Built-in game
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${form.gameSource === "quizlet" ? "btn-primary" : "btn-secondary"}`}
                  disabled={disabled}
                  onClick={() => patch({ gameSource: "quizlet" })}
                >
                  Quizlet embed
                </button>
              </div>
            </div>

            {form.gameSource === "builtin" && (
              <div className="form-group">
                <label htmlFor={`${idPrefix}-builtin-game`}>Built-in game</label>
                <select
                  id={`${idPrefix}-builtin-game`}
                  value={form.builtinGame}
                  disabled={disabled}
                  onChange={(e) => patch({ builtinGame: e.target.value as BuiltinGame })}
                >
                  {BUILTIN_GAMES.map((game) => (
                    <option key={game.value} value={game.value}>
                      {game.label} — {game.description}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.gameSource === "quizlet" && (
              <div className="form-group">
                <label htmlFor={`${idPrefix}-embed`}>Quizlet embed URL</label>
                <input
                  id={`${idPrefix}-embed`}
                  type="url"
                  value={form.embedUrl}
                  onChange={(e) => patch({ embedUrl: e.target.value })}
                  disabled={disabled}
                  placeholder="https://quizlet.com/.../embed"
                />
              </div>
            )}

            {form.gameSource === "builtin" && (
              <div className="form-group">
                <label>Terms & definitions ({builtinGameLabel(form.builtinGame)})</label>
                <p className="age-group-picker-hint" style={{ marginBottom: "0.5rem" }}>
                  Used by the selected built-in game. Click <strong>Save changes</strong> after
                  changing the game type.
                </p>
                <GameCardsEditor
                  cards={form.gameCards}
                  disabled={disabled}
                  minCards={minCardsForBuiltinGame(form.builtinGame)}
                  onChange={(gameCards) => patch({ gameCards })}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor={`${idPrefix}-game-intro`}>Intro (optional)</label>
              <textarea
                id={`${idPrefix}-game-intro`}
                value={form.content}
                onChange={(e) => patch({ content: e.target.value })}
                rows={2}
                disabled={disabled}
                placeholder="Instructions for students"
              />
            </div>
          </>
        )}

        {form.lessonType === "test" && (
          <div className="form-group">
            <label htmlFor={`${idPrefix}-test-intro`}>Notes (optional)</label>
            <textarea
              id={`${idPrefix}-test-intro`}
              value={form.content}
              onChange={(e) => patch({ content: e.target.value })}
              rows={2}
              disabled={disabled}
              placeholder="Test content will be built later"
            />
            <p className="age-group-picker-hint" style={{ marginTop: "0.35rem" }}>
              Test lessons are placeholders for now — students will see a coming-soon message.
            </p>
          </div>
        )}
      </>
    );
  }

  function renderLessonCard(lesson: Lesson, indexInUnit: number) {
    const isEditing = editingId === lesson.id;
    const isPending = pendingId === lesson.id;

    return (
      <article key={lesson.id} className="course-card" data-color="blue">
        {isEditing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdate(lesson.id);
            }}
          >
            <div className="form-group">
              <label htmlFor={`edit-lesson-title-${lesson.id}`}>Title</label>
              <input
                id={`edit-lesson-title-${lesson.id}`}
                type="text"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, title: e.target.value }))
                }
                disabled={isPending}
              />
            </div>
            {renderTypeFields(editForm, setEditForm, `edit-${lesson.id}`, isPending)}
            <div className="form-group">
              <label htmlFor={`edit-lesson-order-${lesson.id}`}>Order</label>
              <input
                id={`edit-lesson-order-${lesson.id}`}
                type="number"
                min={1}
                value={editForm.orderIndex}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, orderIndex: e.target.value }))
                }
                disabled={isPending}
              />
            </div>
            <div className="course-card-actions">
              <button
                type="submit"
                className="btn btn-primary btn-sm btn-loading"
                disabled={isPending || !editForm.title.trim()}
              >
                {isPending ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={isPending}
                onClick={cancelEdit}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <span className="badge badge-yellow" style={{ marginBottom: "0.5rem" }}>
              {lessonTypeLabel(lesson.lesson_type ?? "game")}
            </span>
            <h3>
              Lesson {indexInUnit + 1}: {lesson.title}
            </h3>
            <p style={{ color: "var(--ink-light)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
              Order: {lesson.order_index}
            </p>
            {lesson.content && <p>{lesson.content}</p>}
            {lesson.lesson_type === "game" && lesson.embed_url && (
              <p style={{ color: "var(--ink-light)", fontSize: "0.85rem" }}>Quizlet embed</p>
            )}
            {lesson.lesson_type === "game" && !lesson.embed_url && lesson.builtin_game && (
              <p style={{ color: "var(--ink-light)", fontSize: "0.85rem" }}>
                Game: {builtinGameLabel(lesson.builtin_game)}
                {validGameCards(normalizeGameCards(lesson.game_cards)).length > 0 &&
                  ` · ${validGameCards(normalizeGameCards(lesson.game_cards)).length} cards`}
              </p>
            )}
            {lesson.lesson_type === "test" && (
              <p style={{ color: "var(--ink-light)", fontSize: "0.85rem" }}>
                Test placeholder
              </p>
            )}
            <div className="course-card-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={isPending}
                onClick={() => startEdit(lesson)}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm btn-loading"
                disabled={isPending}
                onClick={() => handleDelete(lesson)}
              >
                {isPending ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </>
        )}
      </article>
    );
  }

  if (sortedUnits.length === 0) {
    return (
      <p style={{ color: "var(--red-cta)" }}>
        This course has no units. Re-create the course or run the units migration.
      </p>
    );
  }

  return (
    <div>
      {error && (
        <p style={{ color: "var(--red-cta)", marginBottom: "1rem", fontFamily: "var(--font-hand)" }}>
          {error}
        </p>
      )}
      {message && (
        <p style={{ color: "var(--blue-teal)", marginBottom: "1rem", fontFamily: "var(--font-hand)" }}>
          {message}
        </p>
      )}

      <form onSubmit={handleCreate} className="contact-card" style={{ marginBottom: "2rem" }}>
        <h3 style={{ marginBottom: "1rem" }}>Add lesson</h3>
        <div className="form-group">
          <label htmlFor="new-lesson-title">Title</label>
          <input
            id="new-lesson-title"
            type="text"
            value={newLesson.title}
            onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
            required
            placeholder="e.g. Animals flashcards"
          />
        </div>
        {renderTypeFields(newLesson, setNewLesson, "new-lesson", creating)}
        <div className="form-group">
          <label htmlFor="new-lesson-order">Order (within unit)</label>
          <input
            id="new-lesson-order"
            type="number"
            min={1}
            value={newLesson.orderIndex}
            onChange={(e) => setNewLesson({ ...newLesson, orderIndex: e.target.value })}
            placeholder="Auto"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-loading"
          disabled={creating || !newLesson.title.trim()}
        >
          {creating ? (
            <>
              <LoadingSpinner size="sm" />
              Creating…
            </>
          ) : (
            "Create lesson"
          )}
        </button>
      </form>

      {sortedUnits.map((unit) => {
        const unitLessons = lessons
          .filter((l) => l.unit_id === unit.id)
          .sort((a, b) => a.order_index - b.order_index);

        return (
          <section key={unit.id} style={{ marginBottom: "2.5rem" }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
                marginBottom: "1rem",
              }}
            >
              {unitKindLabel(unit.kind)}
            </h2>
            {unitLessons.length === 0 ? (
              <p style={{ color: "var(--ink-light)" }}>No lessons in this unit yet.</p>
            ) : (
              <div className="course-grid">
                {unitLessons.map((lesson, index) => renderLessonCard(lesson, index))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
