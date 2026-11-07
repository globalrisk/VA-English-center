"use client";

import { useTranslations } from "@/components/i18n/LanguageProvider";


import { AgeGroupMultiSelect } from "@/components/admin/AgeGroupMultiSelect";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ageGroupLabel, type AgeGroup } from "@/lib/age-groups";
import { createClient } from "@/lib/supabase/client";
import { getCourseAgeGroups, type Course } from "@/types/course";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  courses: Course[];
};

function CourseLessonsLink({ courseId }: { courseId: string }) {
  const t = useTranslations();
  const [pending, setPending] = useState(false);
  const href = `/admin/courses/${courseId}/lessons`;

  return (
    <Link
      href={href}
      className={`btn btn-secondary btn-sm${pending ? " btn-loading" : ""}`}
      onClick={() => setPending(true)}
    >
      {pending ? (
        <>
          <LoadingSpinner size="sm" label={t("Opening lessons")} />
          {t("Opening…")}</>
      ) : (
        t("Lessons")
      )}
    </Link>
  );
}

export function CourseAgeGroupEditor({ courses }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [message, setMessage] = useState<{
    action: "created" | "updated" | "deleted";
    title: string;
    ageGroups?: AgeGroup[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAgeGroups, setNewAgeGroups] = useState<AgeGroup[]>(["kids"]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAgeGroups, setEditAgeGroups] = useState<AgeGroup[]>([]);

  function startEdit(course: Course) {
    setEditingId(course.id);
    setEditTitle(course.title);
    setEditDescription(course.description ?? "");
    setEditAgeGroups(getCourseAgeGroups(course));
    setMessage(null);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
    setEditAgeGroups([]);
  }

  async function handleUpdate(courseId: string) {
    setMessage(null);
    setError(null);
    setPendingId(courseId);

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("admin_update_course", {
      course_id: courseId,
      course_title: editTitle.trim(),
      course_description: editDescription.trim() || null,
      course_age_groups: editAgeGroups,
    });

    setPendingId(null);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setMessage({ action: "updated", title: editTitle.trim() });
    cancelEdit();
    router.refresh();
  }

  async function handleDelete(course: Course) {
    const confirmed = window.confirm(
      t("Delete \"{0}\"? All lessons in this course will be removed. This cannot be undone.", { 0: course.title })
    );
    if (!confirmed) return;

    setMessage(null);
    setError(null);
    setPendingId(course.id);

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("admin_delete_course", {
      course_id: course.id,
    });

    setPendingId(null);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    if (editingId === course.id) cancelEdit();
    setMessage({ action: "deleted", title: course.title });
    router.refresh();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setCreating(true);

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("admin_create_course", {
      course_title: newTitle.trim(),
      course_description: newDescription.trim() || null,
      course_age_groups: newAgeGroups,
    });

    setCreating(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setMessage({ action: "created", title: newTitle.trim(), ageGroups: newAgeGroups });
    setNewTitle("");
    setNewDescription("");
    setNewAgeGroups(["kids"]);
    router.refresh();
  }

  return (
    <div>
      {error && (
        <p style={{ color: "var(--red-cta)", marginBottom: "1rem", fontFamily: "var(--font-hand)" }}>
          {t(error)}
        </p>
      )}
      {message && (
        <p style={{ color: "var(--blue-teal)", marginBottom: "1rem", fontFamily: "var(--font-hand)" }}>
          {message.action === "created"
            ? t('Created "{0}" for {1}.', { 0: message.title, 1: (message.ageGroups ?? []).map((group) => t(ageGroupLabel(group))).join(", ") })
            : t(message.action === "updated" ? 'Updated "{0}".' : 'Deleted "{0}".', { 0: message.title })}
        </p>
      )}

      <form onSubmit={handleCreate} className="contact-card" style={{ marginBottom: "2rem" }}>
        <h3 style={{ marginBottom: "1rem" }}>{t("Add course")}</h3>
        <div className="form-group">
          <label htmlFor="new-course-title">{t("Title")}</label>
          <input
            id="new-course-title"
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            placeholder={t("e.g. Little Teens Conversation")}
          />
        </div>
        <div className="form-group">
          <label htmlFor="new-course-description">{t("Description")}</label>
          <textarea
            id="new-course-description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={2}
            placeholder={t("Short summary for students")}
          />
        </div>
        <div className="form-group">
          <label>{t("Age groups")}</label>
          <AgeGroupMultiSelect
            idPrefix="new-course"
            selected={newAgeGroups}
            onChange={setNewAgeGroups}
            showHint={false}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-loading"
          disabled={creating || !newTitle.trim() || newAgeGroups.length === 0}
        >
          {creating ? (
            <>
              <LoadingSpinner size="sm" />
              {t("Creating…")}</>
          ) : (
            t("Create course")
          )}
        </button>
      </form>

      <div className="course-grid">
        {courses.map((course) => {
          const isEditing = editingId === course.id;
          const isPending = pendingId === course.id;
          const ageGroups = getCourseAgeGroups(course);

          return (
            <article key={course.id} className="course-card" data-color="pink">
              {isEditing ? (
                <>
                  <div className="form-group">
                    <label htmlFor={`edit-title-${course.id}`}>{t("Title")}</label>
                    <input
                      id={`edit-title-${course.id}`}
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                      disabled={isPending}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor={`edit-desc-${course.id}`}>{t("Description")}</label>
                    <textarea
                      id={`edit-desc-${course.id}`}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      disabled={isPending}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t("Age groups")}</label>
                    <AgeGroupMultiSelect
                      idPrefix={`edit-${course.id}`}
                      selected={editAgeGroups}
                      disabled={isPending}
                      onChange={setEditAgeGroups}
                      showHint={false}
                    />
                  </div>
                  <div className="course-card-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm btn-loading"
                      disabled={isPending || !editTitle.trim() || editAgeGroups.length === 0}
                      onClick={() => handleUpdate(course.id)}
                    >
                      {isPending ? (
                        <>
                          <LoadingSpinner size="sm" />
                          {t("Saving…")}</>
                      ) : (
                        t("Save changes")
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={isPending}
                      onClick={cancelEdit}
                    >
                      {t("Cancel")}</button>
                  </div>
                </>
              ) : (
                <>
                  <h3>{course.title}</h3>
                  {course.description && (
                    <p style={{ color: "var(--ink-light)", marginBottom: "0.75rem" }}>
                      {course.description}
                    </p>
                  )}
                  <p style={{ color: "var(--ink-light)", marginBottom: "0.75rem" }}>
                    {t("Age groups: ")}<strong>{ageGroups.map((group) => t(ageGroupLabel(group))).join(", ")}</strong>
                  </p>
                  <div className="course-card-actions">
                    <CourseLessonsLink courseId={course.id} />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={isPending}
                      onClick={() => startEdit(course)}
                    >
                      {t("Edit")}</button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm btn-loading"
                      disabled={isPending}
                      onClick={() => handleDelete(course)}
                    >
                      {isPending ? (
                        <>
                          <LoadingSpinner size="sm" />
                          {t("Deleting…")}</>
                      ) : (
                        t("Delete")
                      )}
                    </button>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>

      {courses.length === 0 && (
        <p style={{ color: "var(--ink-light)" }}>{t("No courses yet. Create one above.")}</p>
      )}
    </div>
  );
}
