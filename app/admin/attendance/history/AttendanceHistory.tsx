"use client";

import { useLanguage, useTranslations } from "@/components/i18n/LanguageProvider";


import { formatVietnamDateTime, vietnamDateKey } from "@/lib/attendance";
import { createClient } from "@/lib/supabase/client";
import type { AttendanceClass, AttendanceHistoryRow, AttendanceStudent } from "@/types/attendance";
import { useCallback, useEffect, useMemo, useState } from "react";

function firstDayOfMonth() {
  const today = vietnamDateKey(new Date());
  return `${today.slice(0, 8)}01`;
}

export function AttendanceHistory() {
  const t = useTranslations();
  const { locale } = useLanguage();
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<AttendanceHistoryRow[]>([]);
  const [classes, setClasses] = useState<AttendanceClass[]>([]);
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [from, setFrom] = useState(firstDayOfMonth);
  const [to, setTo] = useState(() => vietnamDateKey(new Date()));
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [historyResult, classResult, studentResult] = await Promise.all([
      supabase.rpc("admin_attendance_history", { p_from: from, p_to: to, p_class_id: classId || null, p_student_id: studentId || null, p_status: status || null }),
      supabase.from("attendance_classes").select("*").order("name"),
      supabase.from("attendance_students").select("*").order("full_name"),
    ]);
    const firstError = historyResult.error ?? classResult.error ?? studentResult.error;
    if (firstError) setError(firstError.message);
    else {
      setRows((historyResult.data as AttendanceHistoryRow[]) ?? []);
      setClasses((classResult.data as AttendanceClass[]) ?? []);
      setStudents((studentResult.data as AttendanceStudent[]) ?? []);
      setError("");
    }
    setLoading(false);
  }, [classId, from, status, studentId, supabase, to]);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="attendance-view">
      <div className="attendance-view-title"><div><h2>{t("History")}</h2><p>{t("Filter attendance across classes and students.")}</p></div></div>
      <div className="attendance-card attendance-filters">
        <label><span>{t("From")}</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label><span>{t("To")}</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <label><span>{t("Class")}</span><select value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">{t("All classes")}</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span>{t("Student")}</span><select value={studentId} onChange={(event) => setStudentId(event.target.value)}><option value="">{t("All students")}</option>{students.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></label>
        <label><span>{t("Status")}</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t("All statuses")}</option>{["present", "late", "absent", "excused", "needs_follow_up", "unmarked", "canceled"].map((item) => <option key={item} value={item}>{t(item.replaceAll("_", " "))}</option>)}</select></label>
      </div>
      {error ? <p className="attendance-error" role="alert">{t(error)}</p> : null}
      <div className="attendance-card attendance-table-wrap">
        <table className="attendance-table">
          <thead><tr><th>{t("Date & time")}</th><th>{t("Class")}</th><th>{t("Student")}</th><th>{t("Status")}</th><th>{t("Check-in")}</th></tr></thead>
          <tbody>
            {rows.map((row) => <tr key={`${row.session_id}:${row.student_id}`}><td>{formatVietnamDateTime(row.starts_at, locale)}</td><td>{row.class_name}</td><td><strong>{row.full_name}</strong><small>{row.display_name}</small></td><td><span className={`attendance-badge ${row.resolved_status}`}>{t(row.resolved_status.replaceAll("_", " "))}</span></td><td>{row.checked_in_at ? formatVietnamDateTime(row.checked_in_at, locale) : "—"}</td></tr>)}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? <div className="attendance-empty">{t("No attendance matches these filters.")}</div> : null}
        {loading ? <div className="attendance-empty">{t("Loading history…")}</div> : null}
      </div>
    </section>
  );
}
