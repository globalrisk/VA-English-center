"use client";

import { AgeGroupMultiSelect } from "@/components/admin/AgeGroupMultiSelect";
import { ageGroupsLabel, type AgeGroup } from "@/lib/age-groups";
import { createClient } from "@/lib/supabase/client";
import { getCourseAgeGroups, type Course } from "@/types/course";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  courses: Course[];
};

export function CourseAgeGroupEditor({ courses }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
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

    setMessage(`Updated "${editTitle.trim()}".`);
    cancelEdit();
    router.refresh();
  }

  async function handleDelete(course: Course) {
    const confirmed = window.confirm(
      `Delete "${course.title}"? All lessons in this course will be removed. This cannot be undone.`
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
    setMessage(`Deleted "${course.title}".`);
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

    setMessage(`Created "${newTitle.trim()}" for ${ageGroupsLabel(newAgeGroups)}.`);
    setNewTitle("");
    setNewDescription("");
    setNewAgeGroups(["kids"]);
    router.refresh();
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
        <h3 style={{ marginBottom: "1rem" }}>Add course</h3>
        <div className="form-group">
          <label htmlFor="new-course-title">Title</label>
          <input
            id="new-course-title"
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            placeholder="e.g. Little Teens Conversation"
          />
        </div>
        <div className="form-group">
          <label htmlFor="new-course-description">Description</label>
          <textarea
            id="new-course-description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={2}
            placeholder="Short summary for students"
          />
        </div>
        <div className="form-group">
          <label>Age groups</label>
          <AgeGroupMultiSelect
            idPrefix="new-course"
            selected={newAgeGroups}
            onChange={setNewAgeGroups}
            showHint={false}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={creating || !newTitle.trim() || newAgeGroups.length === 0}
        >
          {creating ? "Creating…" : "Create course"}
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
                    <label htmlFor={`edit-title-${course.id}`}>Title</label>
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
                    <label htmlFor={`edit-desc-${course.id}`}>Description</label>
                    <textarea
                      id={`edit-desc-${course.id}`}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      disabled={isPending}
                    />
                  </div>
                  <div className="form-group">
                    <label>Age groups</label>
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
                      className="btn btn-primary btn-sm"
                      disabled={isPending || !editTitle.trim() || editAgeGroups.length === 0}
                      onClick={() => handleUpdate(course.id)}
                    >
                      {isPending ? "Saving…" : "Save changes"}
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
                    Age groups: <strong>{ageGroupsLabel(ageGroups)}</strong>
                  </p>
                  <div className="course-card-actions">
                    <Link
                      href={`/admin/courses/${course.id}/lessons`}
                      className="btn btn-secondary btn-sm"
                    >
                      Lessons
                    </Link>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={isPending}
                      onClick={() => startEdit(course)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      disabled={isPending}
                      onClick={() => handleDelete(course)}
                    >
                      {isPending ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>

      {courses.length === 0 && (
        <p style={{ color: "var(--ink-light)" }}>No courses yet. Create one above.</p>
      )}
    </div>
  );
}
