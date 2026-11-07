"use client";

import { useTranslations } from "@/components/i18n/LanguageProvider";


import { normalizeVietnamPhone } from "@/lib/attendance";
import { createClient } from "@/lib/supabase/client";
import type { AttendanceStudent } from "@/types/attendance";
import { useCallback, useEffect, useMemo, useState } from "react";

const emptyForm = { full_name: "", display_name: "", parent_name: "", parent_phone: "" };

export function RosterManager() {
  const t = useTranslations();
  const supabase = useMemo(() => createClient(), []);
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    let query = supabase.from("attendance_students").select("*").order("full_name");
    if (!showArchived) query = query.is("archived_at", null);
    const result = await query;
    if (result.error) setError(result.error.message);
    else setStudents((result.data as AttendanceStudent[]) ?? []);
  }, [showArchived, supabase]);

  useEffect(() => { void load(); }, [load]);

  function edit(student: AttendanceStudent) {
    setEditingId(student.id);
    setForm({ full_name: student.full_name, display_name: student.display_name, parent_name: student.parent_name, parent_phone: student.parent_phone });
    setError("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizeVietnamPhone(form.parent_phone);
    if (!normalized) {
      setError("Enter a Vietnam phone number such as 090 123 4567 or +84 901 234 567.");
      return;
    }
    setSaving(true);
    setError("");
    const values = { ...form, full_name: form.full_name.trim(), display_name: form.display_name.trim(), parent_name: form.parent_name.trim(), parent_phone: form.parent_phone.trim() };
    const result = editingId
      ? await supabase.from("attendance_students").update(values).eq("id", editingId)
      : await supabase.from("attendance_students").insert(values);
    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setForm(emptyForm);
    setEditingId(null);
    await load();
  }

  async function setArchived(student: AttendanceStudent, archived: boolean) {
    if (archived && !window.confirm(t("Archive {0}? They will disappear from open and future rosters.", { 0: student.full_name }))) return;
    const result = await supabase.rpc("admin_set_attendance_student_archived", { p_student_id: student.id, p_archived: archived });
    if (result.error) setError(result.error.message);
    else await load();
  }

  return (
    <section className="attendance-view">
      <div className="attendance-view-title"><div><h2>{t("Attendance roster")}</h2><p>{t("These students are separate from learning portal accounts.")}</p></div></div>
      {error ? <p className="attendance-error" role="alert">{t(error)}</p> : null}
      <div className="attendance-two-column">
        <form className="attendance-card attendance-form-stack" onSubmit={save}>
          <h3>{editingId ? t("Edit student") : t("Add student")}</h3>
          <label><span>{t("Full name")}</span><input required value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label>
          <label><span>{t("Public display name")}</span><input required value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} /><small>{t("Shown on the public check-in page.")}</small></label>
          <label><span>{t("Parent name")}</span><input required value={form.parent_name} onChange={(event) => setForm({ ...form, parent_name: event.target.value })} /></label>
          <label><span>{t("Parent phone")}</span><input required inputMode="tel" placeholder="090 123 4567" value={form.parent_phone} onChange={(event) => setForm({ ...form, parent_phone: event.target.value })} /></label>
          <div className="attendance-form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? t("Saving…") : t("Save student")}</button>
            {editingId ? <button className="btn btn-secondary" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>{t("Cancel")}</button> : null}
          </div>
        </form>
        <div>
          <label className="attendance-check"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> {t(" Show archived")}</label>
          <div className="attendance-card-list">
            {students.map((student) => <article className="attendance-card attendance-directory-card" key={student.id}>
              <div><h3>{student.full_name}</h3><p>{student.display_name} · {student.parent_name}</p><a href={`tel:${normalizeVietnamPhone(student.parent_phone) ?? ""}`}>{student.parent_phone}</a></div>
              <div className="attendance-inline-actions"><button className="btn btn-secondary btn-small" type="button" onClick={() => edit(student)}>{t("Edit")}</button><button className="btn btn-quiet btn-small" type="button" onClick={() => void setArchived(student, !student.archived_at)}>{student.archived_at ? t("Restore") : t("Archive")}</button></div>
            </article>)}
            {students.length === 0 ? <div className="attendance-card attendance-empty">{t("No students found.")}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
