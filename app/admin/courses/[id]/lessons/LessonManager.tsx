"use client";

import { GameCardsEditor } from "@/components/admin/GameCardsEditor";
import { TestContentEditor } from "@/components/admin/TestContentEditor";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { createClient } from "@/lib/supabase/client";
import {
  builtinGameLabel,
  builtinGamesForUnit,
  isBuiltinGameAllowedInUnit,
  minCardsForBuiltinGame,
  normalizeBuiltinGameForUnit,
  type BuiltinGame,
} from "@/lib/builtin-games";
import { lessonTypeLabel, lessonTypesForUnit, type LessonType } from "@/lib/lesson-types";
import {
  countTestQuestions,
  emptyTestContent,
  normalizeTestContent,
  sanitizeTestContent,
  validateTestContent,
  type TestContent,
} from "@/lib/test-content";
import { unitKindLabel, type UnitKind } from "@/lib/units";
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

type LessonForm = {
  title: string;
  content: string;
  orderIndex: string;
  unitId: string;
  lessonType: LessonType;
  builtinGame: BuiltinGame;
  gameCards: GameCard[];
  testContent: TestContent;
};

function unitKindForId(units: Unit[], unitId: string): UnitKind | null {
  return units.find((unit) => unit.id === unitId)?.kind ?? null;
}

function emptyForm(defaultUnitId: string, units: Unit[]): LessonForm {
  const unitKind = unitKindForId(units, defaultUnitId) ?? "vocabulary";
  return {
    title: "",
    content: "",
    orderIndex: "",
    unitId: defaultUnitId,
    lessonType: "game",
    builtinGame: normalizeBuiltinGameForUnit(unitKind, "flashcards"),
    gameCards: [{ term: "", definition: "" }, { term: "", definition: "" }],
    testContent: emptyTestContent(),
  };
}

function validateLessonForm(form: LessonForm, units: Unit[]): string | null {
  if (!form.title.trim()) return "Title is required.";
  if (!form.unitId) return "Unit is required.";

  const unitKind = unitKindForId(units, form.unitId);

  if (form.lessonType === "game") {
    if (unitKind && !isBuiltinGameAllowedInUnit(unitKind, form.builtinGame)) {
      return `${unitKindLabel(unitKind)} game lessons only support Flashcards.`;
    }

    const cards = validGameCards(form.gameCards);
    const minCards = minCardsForBuiltinGame(form.builtinGame);
    if (cards.length < minCards) {
      const label = builtinGameLabel(form.builtinGame);
      return `${label} needs at least ${minCards} flashcards with both term and definition filled in.`;
    }
  }

  if (form.lessonType === "test") {
    return validateTestContent(form.testContent);
  }

  return null;
}

function rpcPayload(form: LessonForm, units: Unit[], orderIndex: number | null) {
  const cards = validGameCards(form.gameCards);
  const unitKind = unitKindForId(units, form.unitId);
  const builtinGame =
    form.lessonType === "game"
      ? normalizeBuiltinGameForUnit(unitKind, form.builtinGame)
      : null;

  return {
    lesson_unit_id: form.unitId,
    lesson_title: form.title.trim(),
    lesson_content: form.content.trim() || null,
    lesson_image_url: null,
    lesson_video_url: null,
    lesson_order_index: orderIndex,
    lesson_type: form.lessonType,
    lesson_embed_url: null,
    lesson_game_cards: form.lessonType === "game" ? cards : [],
    lesson_builtin_game: builtinGame,
    lesson_test_content:
      form.lessonType === "test" ? sanitizeTestContent(form.testContent) : {},
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

  const [newLesson, setNewLesson] = useState<LessonForm>(() =>
    emptyForm(defaultUnitId, sortedUnits)
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LessonForm>(() =>
    emptyForm(defaultUnitId, sortedUnits)
  );

  function lessonToForm(lesson: Lesson): LessonForm {
    const unitKind = unitKindForId(sortedUnits, lesson.unit_id);
    return {
      title: lesson.title,
      content: lesson.content ?? "",
      orderIndex: String(lesson.order_index),
      unitId: lesson.unit_id,
      lessonType: lesson.lesson_type ?? "game",
      builtinGame: normalizeBuiltinGameForUnit(unitKind, lesson.builtin_game),
      gameCards: normalizeGameCards(lesson.game_cards),
      testContent: normalizeTestContent(lesson.test_content),
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
    setEditForm(emptyForm(defaultUnitId, sortedUnits));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const validationError = validateLessonForm(newLesson, sortedUnits);
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
        ...rpcPayload(newLesson, sortedUnits, orderValue ? Number(orderValue) : null),
      });

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      setMessage(`Created lesson "${newLesson.title.trim()}".`);
      setNewLesson(emptyForm(defaultUnitId, sortedUnits));
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

    const validationError = validateLessonForm(editForm, sortedUnits);
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
        ...rpcPayload(editForm, sortedUnits, orderIndex),
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

  function handleUnitChange(
    unitId: string,
    form: LessonForm,
    patch: (updates: Partial<LessonForm>) => void
  ) {
    const unitKind = unitKindForId(sortedUnits, unitId);
    const updates: Partial<LessonForm> = { unitId };

    if (form.lessonType === "game" && unitKind) {
      updates.builtinGame = normalizeBuiltinGameForUnit(unitKind, form.builtinGame);
    }

    patch(updates);
  }

  function renderTypeFields(
    form: LessonForm,
    setForm: Dispatch<SetStateAction<LessonForm>>,
    idPrefix: string,
    disabled?: boolean
  ) {
    const patch = (updates: Partial<LessonForm>) =>
      setForm((prev) => ({ ...prev, ...updates }));
    const selectedUnitKind = unitKindForId(sortedUnits, form.unitId);
    const availableLessonTypes = lessonTypesForUnit(selectedUnitKind ?? "vocabulary");
    const availableBuiltinGames = builtinGamesForUnit(selectedUnitKind ?? "vocabulary");
    const flashcardsOnlyUnit =
      selectedUnitKind === "reading" || selectedUnitKind === "listening";

    return (
      <>
        <div className="form-group">
          <label htmlFor={`${idPrefix}-unit`}>Unit</label>
          <select
            id={`${idPrefix}-unit`}
            value={form.unitId}
            disabled={disabled}
            onChange={(e) => handleUnitChange(e.target.value, form, patch)}
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
            {availableLessonTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label} — {type.description}
              </option>
            ))}
          </select>
        </div>

        {form.lessonType === "game" && (
          <>
            <div className="form-group">
              <label htmlFor={`${idPrefix}-builtin-game`}>Built-in game</label>
              <select
                id={`${idPrefix}-builtin-game`}
                value={form.builtinGame}
                disabled={disabled || availableBuiltinGames.length === 1}
                onChange={(e) => patch({ builtinGame: e.target.value as BuiltinGame })}
              >
                {availableBuiltinGames.map((game) => (
                  <option key={game.value} value={game.value}>
                    {game.label} — {game.description}
                  </option>
                ))}
              </select>
              {flashcardsOnlyUnit && (
                <p className="age-group-picker-hint" style={{ marginTop: "0.35rem" }}>
                  {unitKindLabel(selectedUnitKind!)} game lessons support Flashcards only.
                </p>
              )}
            </div>

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
          <>
            <div className="form-group">
              <label htmlFor={`${idPrefix}-test-intro`}>Intro (optional)</label>
              <textarea
                id={`${idPrefix}-test-intro`}
                value={form.content}
                onChange={(e) => patch({ content: e.target.value })}
                rows={2}
                disabled={disabled}
                placeholder="Short instructions for students"
              />
            </div>
            <div className="form-group">
              <label>Passage & questions</label>
              <TestContentEditor
                value={form.testContent}
                disabled={disabled}
                onChange={(testContent) => patch({ testContent })}
              />
            </div>
          </>
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
                disabled={isPending}
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
            {lesson.lesson_type === "game" && lesson.builtin_game && (
              <p style={{ color: "var(--ink-light)", fontSize: "0.85rem" }}>
                Game: {builtinGameLabel(lesson.builtin_game)}
                {validGameCards(normalizeGameCards(lesson.game_cards)).length > 0 &&
                  ` · ${validGameCards(normalizeGameCards(lesson.game_cards)).length} cards`}
              </p>
            )}
            {lesson.lesson_type === "test" && (
              <p style={{ color: "var(--ink-light)", fontSize: "0.85rem" }}>
                Reading test
                {(() => {
                  const test = normalizeTestContent(lesson.test_content);
                  const n = countTestQuestions(test);
                  return n > 0
                    ? ` · ${test.paragraphs.length} paragraphs · ${n} questions`
                    : " · not configured";
                })()}
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
          disabled={creating}
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
