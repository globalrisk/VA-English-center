"use client";

import { useLanguage, useTranslations } from "@/components/i18n/LanguageProvider";


import { formatVietnamDateTime, getAttendanceWindow } from "@/lib/attendance";
import { createClient } from "@/lib/supabase/client";
import type { PublicAttendanceSession, PublicAttendanceStudent } from "@/types/attendance";
import { useCallback, useEffect, useMemo, useState } from "react";

export function CheckInClient({
  initialSessions,
  initialError = false,
}: {
  initialSessions: PublicAttendanceSession[];
  initialError?: boolean;
}) {
  const t = useTranslations();
  const { locale } = useLanguage();
  const supabase = useMemo(() => createClient(), []);
  const [sessions, setSessions] = useState<PublicAttendanceSession[]>(initialSessions);
  const [students, setStudents] = useState<PublicAttendanceStudent[]>([]);
  const [sessionId, setSessionId] = useState(initialSessions[0]?.session_id ?? "");
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(initialError ? "Check-in is temporarily unavailable. Please tell your teacher." : "");

  const loadSessions = useCallback(async () => {
    const result = await supabase.rpc("public_open_attendance_sessions");
    if (result.error) {
      setError("Check-in is temporarily unavailable. Please tell your teacher.");
    } else {
      const next = (result.data as PublicAttendanceSession[]) ?? [];
      setSessions(next);
      setSessionId((current) => next.some((session) => session.session_id === current) ? current : next[0]?.session_id ?? "");
    }
    setLoading(false);
  }, [supabase]);

  const loadRoster = useCallback(async () => {
    if (!sessionId) {
      setStudents([]);
      return;
    }
    const result = await supabase.rpc("public_attendance_roster", { p_session_id: sessionId });
    if (result.error) {
      setError("The class list could not be loaded.");
      setStudents([]);
      return;
    }
    setStudents((result.data as PublicAttendanceStudent[]) ?? []);
    setStudentId("");
  }, [sessionId, supabase]);

  useEffect(() => {
    void loadSessions();
    const interval = window.setInterval(() => void loadSessions(), 30_000);
    return () => window.clearInterval(interval);
  }, [loadSessions]);

  useEffect(() => {
    setMessage("");
    setError("");
    void loadRoster();
  }, [loadRoster]);

  const selectedSession = sessions.find((session) => session.session_id === sessionId);
  const selectedStudent = students.find((student) => student.student_id === studentId);

  async function submitCheckIn() {
    if (!sessionId || !studentId || !selectedStudent) return;
    if (!window.confirm(t("Check in as {0}?", { 0: selectedStudent.display_name }))) return;
    setSubmitting(true);
    setError("");
    const result = await supabase.rpc("public_check_in", {
      p_session_id: sessionId,
      p_student_id: studentId,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message || "Check-in could not be completed.");
      return;
    }
    setMessage("Checked in");
    await loadRoster();
  }

  if (loading) return <div className="attendance-card check-in-card">{t("Loading open classes…")}</div>;

  return (
    <section className="attendance-card check-in-card" aria-live="polite">
      {message ? (
        <div className="check-in-success">
          <span aria-hidden="true">✓</span>
          <h2>{t("Checked in")}</h2>
          <p>{t("You’re all set. Have a wonderful class!")}</p>
          <button className="btn btn-secondary" type="button" onClick={() => setMessage("")}>{t("Check in another student")}</button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="attendance-empty">
          <h2>{t("No classes are open right now")}</h2>
          <p>{t("Check-in opens 15 minutes before class and closes when class ends.")}</p>
        </div>
      ) : (
        <div className="attendance-form-stack">
          <label>
            <span>{t("1. Choose your class")}</span>
            <select value={sessionId} onChange={(event) => setSessionId(event.target.value)}>
              {sessions.map((session) => (
                <option key={session.session_id} value={session.session_id}>
                  {session.class_name} — {formatVietnamDateTime(session.starts_at, locale)}
                </option>
              ))}
            </select>
          </label>

          {selectedSession ? (
            <p className="check-in-session-note">
              <strong>{getAttendanceWindow(new Date(), new Date(selectedSession.starts_at), new Date(selectedSession.ends_at)) === "check_in_open" ? t("Check-in open") : t("In progress")}</strong>
              {selectedSession.teacher_name ? ` · ${selectedSession.teacher_name}` : ""}
              {selectedSession.room_name ? ` · ${selectedSession.room_name}` : ""}
            </p>
          ) : null}

          <label>
            <span>{t("2. Choose your name")}</span>
            <select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
              <option value="">{t("Select your name…")}</option>
              {students.map((student) => (
                <option key={student.student_id} value={student.student_id} disabled={student.checked_in}>
                  {student.display_name}{student.checked_in ? t(" — Checked in") : ""}
                </option>
              ))}
            </select>
          </label>

          <button className="btn btn-primary check-in-submit" type="button" disabled={!studentId || submitting} onClick={submitCheckIn}>
            {submitting ? t("Checking in…") : t("Confirm check-in")}
          </button>
        </div>
      )}
      {error ? <p className="attendance-error" role="alert">{t(error)}</p> : null}
    </section>
  );
}
