"use client";

import { useLanguage, useTranslations } from "@/components/i18n/LanguageProvider";


import {
  formatVietnamDateTime,
  toVietnamLocalInput,
  vietnamDateKey,
  vietnamLocalInputToIso,
} from "@/lib/attendance";
import { createClient } from "@/lib/supabase/client";
import type {
  AttendanceClass,
  AttendanceEnrollment,
  AttendanceScheduleSlot,
  AttendanceSession,
  AttendanceStudent,
} from "@/types/attendance";
import { useCallback, useEffect, useMemo, useState } from "react";

type SlotForm = { iso_weekday: number; start_time: string; end_time: string };
type ClassForm = { name: string; teacher_name: string; room_name: string; term_start: string; term_end: string; effective_date: string; slots: SlotForm[] };
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const blankClass = (): ClassForm => ({ name: "", teacher_name: "", room_name: "", term_start: "", term_end: "", effective_date: vietnamDateKey(new Date()), slots: [{ iso_weekday: 1, start_time: "17:00", end_time: "18:00" }] });

export function ClassManager() {
  const t = useTranslations();
  const { locale } = useLanguage();
  const supabase = useMemo(() => createClient(), []);
  const [classes, setClasses] = useState<AttendanceClass[]>([]);
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [slots, setSlots] = useState<AttendanceScheduleSlot[]>([]);
  const [enrollments, setEnrollments] = useState<AttendanceEnrollment[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [form, setForm] = useState<ClassForm>(blankClass);
  const [enrollmentStudent, setEnrollmentStudent] = useState("");
  const [enrollmentStart, setEnrollmentStart] = useState("");
  const [enrollmentEnd, setEnrollmentEnd] = useState("");
  const [sessionStart, setSessionStart] = useState("");
  const [sessionEnd, setSessionEnd] = useState("");
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [classResult, studentResult, slotResult, enrollmentResult, sessionResult] = await Promise.all([
      supabase.from("attendance_classes").select("*").order("name"),
      supabase.from("attendance_students").select("*").is("archived_at", null).order("full_name"),
      supabase.from("attendance_schedule_slots").select("*").order("effective_from", { ascending: false }),
      supabase.from("attendance_enrollments").select("*").order("start_date"),
      supabase.from("attendance_sessions").select("*").gte("ends_at", new Date().toISOString()).order("starts_at").limit(200),
    ]);
    const firstError = [classResult, studentResult, slotResult, enrollmentResult, sessionResult].find((result) => result.error)?.error;
    if (firstError) setError(firstError.message);
    else {
      const loadedClasses = (classResult.data as AttendanceClass[]) ?? [];
      setClasses(loadedClasses);
      setStudents((studentResult.data as AttendanceStudent[]) ?? []);
      setSlots((slotResult.data as AttendanceScheduleSlot[]) ?? []);
      setEnrollments((enrollmentResult.data as AttendanceEnrollment[]) ?? []);
      setSessions((sessionResult.data as AttendanceSession[]) ?? []);
      setSelectedClassId((current) => loadedClasses.some((item) => item.id === current) ? current : loadedClasses.find((item) => !item.archived_at)?.id ?? "");
    }
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  const selectedClass = classes.find((item) => item.id === selectedClassId);
  const classEnrollments = enrollments.filter((item) => item.class_id === selectedClassId);
  const classSessions = sessions.filter((item) => item.class_id === selectedClassId);

  function startEdit(item: AttendanceClass) {
    const currentSlots = slots.filter((slot) => slot.class_id === item.id);
    const newestEffective = currentSlots.reduce((latest, slot) => slot.effective_from > latest ? slot.effective_from : latest, "");
    const latestSlots = currentSlots.filter((slot) => slot.effective_from === newestEffective);
    setEditingClassId(item.id);
    setForm({
      name: item.name,
      teacher_name: item.teacher_name ?? "",
      room_name: item.room_name ?? "",
      term_start: item.term_start,
      term_end: item.term_end,
      effective_date: vietnamDateKey(new Date()),
      slots: latestSlots.length ? latestSlots.map((slot) => ({ iso_weekday: slot.iso_weekday, start_time: slot.start_time.slice(0, 5), end_time: slot.end_time.slice(0, 5) })) : [{ iso_weekday: 1, start_time: "17:00", end_time: "18:00" }],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveClass(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const result = await supabase.rpc("admin_save_attendance_class", {
      p_class_id: editingClassId,
      p_name: form.name,
      p_teacher_name: form.teacher_name || null,
      p_room_name: form.room_name || null,
      p_term_start: form.term_start,
      p_term_end: form.term_end,
      p_effective_date: editingClassId ? form.effective_date : form.term_start,
      p_slots: form.slots.map((slot) => ({ ...slot, start_time: `${slot.start_time}:00`, end_time: `${slot.end_time}:00` })),
    });
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    setEditingClassId(null);
    setForm(blankClass());
    await load();
    if (typeof result.data === "string") setSelectedClassId(result.data);
  }

  async function archiveClass(item: AttendanceClass) {
    if (!window.confirm(t("Archive {0}? Future sessions will be canceled and history will be kept.", { 0: item.name }))) return;
    const result = await supabase.rpc("admin_set_attendance_class_archived", { p_class_id: item.id, p_archived: true });
    if (result.error) setError(result.error.message); else await load();
  }

  async function saveEnrollment(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedClassId || !enrollmentStudent) return;
    const result = await supabase.rpc("admin_save_attendance_enrollment", {
      p_enrollment_id: null,
      p_class_id: selectedClassId,
      p_student_id: enrollmentStudent,
      p_start_date: enrollmentStart || selectedClass?.term_start,
      p_end_date: enrollmentEnd || selectedClass?.term_end,
    });
    if (result.error) setError(result.error.message);
    else { setEnrollmentStudent(""); await load(); }
  }

  async function removeEnrollment(id: string) {
    if (!window.confirm(t("Remove this enrollment? Existing attendance history remains attached to the student."))) return;
    const result = await supabase.from("attendance_enrollments").delete().eq("id", id);
    if (result.error) setError(result.error.message); else await load();
  }

  async function changeSession(action: "add" | "reschedule" | "cancel", sessionId: string | null = null) {
    const result = await supabase.rpc("admin_change_attendance_session", {
      p_action: action,
      p_session_id: sessionId,
      p_class_id: selectedClassId || null,
      p_starts_at: action === "cancel" ? null : vietnamLocalInputToIso(sessionStart),
      p_ends_at: action === "cancel" ? null : vietnamLocalInputToIso(sessionEnd),
    });
    if (result.error) setError(result.error.message);
    else { setSessionStart(""); setSessionEnd(""); setRescheduleId(null); await load(); }
  }

  function beginReschedule(session: AttendanceSession) {
    setRescheduleId(session.id);
    setSessionStart(toVietnamLocalInput(session.starts_at));
    setSessionEnd(toVietnamLocalInput(session.ends_at));
  }

  return (
    <section className="attendance-view">
      <div className="attendance-view-title"><div><h2>{t("Classes")}</h2><p>{t("Weekly schedules generate sessions for the full class term.")}</p></div></div>
      {error ? <p className="attendance-error" role="alert">{t(error)}</p> : null}
      <form className="attendance-card attendance-form-stack" onSubmit={saveClass}>
        <h3>{editingClassId ? t("Edit class and future schedule") : t("Create class")}</h3>
        <div className="attendance-form-grid">
          <label><span>{t("Class name")}</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label><span>{t("Teacher (optional)")}</span><input value={form.teacher_name} onChange={(event) => setForm({ ...form, teacher_name: event.target.value })} /></label>
          <label><span>{t("Room (optional)")}</span><input value={form.room_name} onChange={(event) => setForm({ ...form, room_name: event.target.value })} /></label>
          <label><span>{t("Term starts")}</span><input required type="date" value={form.term_start} onChange={(event) => setForm({ ...form, term_start: event.target.value })} /></label>
          <label><span>{t("Term ends")}</span><input required type="date" value={form.term_end} onChange={(event) => setForm({ ...form, term_end: event.target.value })} /></label>
          {editingClassId ? <label><span>{t("New schedule effective")}</span><input required type="date" value={form.effective_date} onChange={(event) => setForm({ ...form, effective_date: event.target.value })} /></label> : null}
        </div>
        <div className="attendance-slot-list">
          <strong>{t("Weekly time slots")}</strong>
          {form.slots.map((slot, index) => <div className="attendance-slot" key={index}>
            <select aria-label={t("Weekday")} value={slot.iso_weekday} onChange={(event) => setForm({ ...form, slots: form.slots.map((item, itemIndex) => itemIndex === index ? { ...item, iso_weekday: Number(event.target.value) } : item) })}>{weekdays.map((day, dayIndex) => <option key={t(day)} value={dayIndex + 1}>{t(day)}</option>)}</select>
            <input aria-label={t("Start time")} type="time" required value={slot.start_time} onChange={(event) => setForm({ ...form, slots: form.slots.map((item, itemIndex) => itemIndex === index ? { ...item, start_time: event.target.value } : item) })} />
            <span>{t("to")}</span>
            <input aria-label={t("End time")} type="time" required value={slot.end_time} onChange={(event) => setForm({ ...form, slots: form.slots.map((item, itemIndex) => itemIndex === index ? { ...item, end_time: event.target.value } : item) })} />
            {form.slots.length > 1 ? <button className="status-action clear" type="button" aria-label={t("Remove slot")} onClick={() => setForm({ ...form, slots: form.slots.filter((_, itemIndex) => itemIndex !== index) })}>×</button> : null}
          </div>)}
          <button className="btn btn-quiet btn-small" type="button" onClick={() => setForm({ ...form, slots: [...form.slots, { iso_weekday: 1, start_time: "17:00", end_time: "18:00" }] })}>{t("+ Add weekly slot")}</button>
        </div>
        <div className="attendance-form-actions"><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? t("Saving…") : t("Save class")}</button>{editingClassId ? <button className="btn btn-secondary" type="button" onClick={() => { setEditingClassId(null); setForm(blankClass()); }}>{t("Cancel")}</button> : null}</div>
      </form>

      <div className="attendance-class-selector">
        <label><span>{t("Manage a class")}</span><select value={selectedClassId} onChange={(event) => { const id = event.target.value; setSelectedClassId(id); const item = classes.find((entry) => entry.id === id); if (item) { setEnrollmentStart(item.term_start); setEnrollmentEnd(item.term_end); } }}><option value="">{t("Select class…")}</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}{item.archived_at ? t(" (archived)") : ""}</option>)}</select></label>
      </div>

      {selectedClass ? <div className="attendance-management-grid">
        <section className="attendance-card">
          <div className="attendance-card-heading"><div><h3>{selectedClass.name}</h3><p>{selectedClass.term_start} {t(" to ")}{selectedClass.term_end}</p></div><div className="attendance-inline-actions"><button className="btn btn-secondary btn-small" type="button" onClick={() => startEdit(selectedClass)}>{t("Edit schedule")}</button>{!selectedClass.archived_at ? <button className="btn btn-quiet btn-small" type="button" onClick={() => void archiveClass(selectedClass)}>{t("Archive")}</button> : null}</div></div>
          <h4>{t("Enrollments")}</h4>
          {!selectedClass.archived_at ? <form className="attendance-enrollment-form" onSubmit={saveEnrollment}>
            <select required value={enrollmentStudent} onChange={(event) => setEnrollmentStudent(event.target.value)}><option value="">{t("Choose student…")}</option>{students.map((student) => <option key={student.id} value={student.id}>{student.full_name} ({student.display_name})</option>)}</select>
            <input required aria-label={t("Enrollment start")} type="date" min={selectedClass.term_start} max={selectedClass.term_end} value={enrollmentStart || selectedClass.term_start} onChange={(event) => setEnrollmentStart(event.target.value)} />
            <input required aria-label={t("Enrollment end")} type="date" min={selectedClass.term_start} max={selectedClass.term_end} value={enrollmentEnd || selectedClass.term_end} onChange={(event) => setEnrollmentEnd(event.target.value)} />
            <button className="btn btn-primary btn-small" type="submit">{t("Enroll")}</button>
          </form> : null}
          <div className="attendance-compact-list">{classEnrollments.map((enrollment) => { const student = students.find((item) => item.id === enrollment.student_id); return <div key={enrollment.id}><span><strong>{student?.full_name ?? t("Archived student")}</strong><small>{enrollment.start_date} – {enrollment.end_date}</small></span><button type="button" className="status-action clear" aria-label={t("Remove enrollment")} onClick={() => void removeEnrollment(enrollment.id)}>×</button></div>; })}{classEnrollments.length === 0 ? <p>{t("No enrollments yet.")}</p> : null}</div>
        </section>

        <section className="attendance-card">
          <h3>{t("Upcoming sessions")}</h3>
          {!selectedClass.archived_at ? <div className="attendance-exception-form"><input aria-label={t("Session start")} type="datetime-local" value={sessionStart} onChange={(event) => setSessionStart(event.target.value)} /><input aria-label={t("Session end")} type="datetime-local" value={sessionEnd} onChange={(event) => setSessionEnd(event.target.value)} /><button className="btn btn-primary btn-small" type="button" disabled={!sessionStart || !sessionEnd} onClick={() => void changeSession(rescheduleId ? "reschedule" : "add", rescheduleId)}>{rescheduleId ? t("Save new time") : t("+ Add one-off")}</button>{rescheduleId ? <button className="btn btn-secondary btn-small" type="button" onClick={() => { setRescheduleId(null); setSessionStart(""); setSessionEnd(""); }}>{t("Cancel")}</button> : null}</div> : null}
          <div className="attendance-compact-list">{classSessions.slice(0, 20).map((session) => <div key={session.id}><span><strong>{formatVietnamDateTime(session.starts_at, locale)}</strong><small>{t(session.state)}{session.is_exception ? t(" · exception") : ""}</small></span>{session.state === "scheduled" && !selectedClass.archived_at ? <span className="attendance-inline-actions"><button className="btn btn-secondary btn-small" type="button" onClick={() => beginReschedule(session)}>{t("Move")}</button><button className="btn btn-quiet btn-small" type="button" onClick={() => void changeSession("cancel", session.id)}>{t("Cancel")}</button></span> : null}</div>)}{classSessions.length === 0 ? <p>{t("No upcoming sessions.")}</p> : null}</div>
        </section>
      </div> : null}
    </section>
  );
}
