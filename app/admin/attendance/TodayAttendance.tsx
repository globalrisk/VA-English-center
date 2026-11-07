"use client";

import { useLanguage, useTranslations } from "@/components/i18n/LanguageProvider";


import {
  formatVietnamTime,
  getAttendanceWindow,
  normalizeVietnamPhone,
  vietnamDateKey,
} from "@/lib/attendance";
import { createClient } from "@/lib/supabase/client";
import type { AttendanceDayRow } from "@/types/attendance";
import { useCallback, useEffect, useMemo, useState } from "react";

type SessionGroup = {
  sessionId: string;
  className: string;
  teacherName: string | null;
  roomName: string | null;
  startsAt: string;
  endsAt: string;
  state: "scheduled" | "canceled";
  rows: AttendanceDayRow[];
};

const statuses = ["present", "late", "absent", "excused"] as const;

function groupRows(rows: AttendanceDayRow[]): SessionGroup[] {
  const groups = new Map<string, SessionGroup>();
  for (const row of rows) {
    const existing = groups.get(row.session_id);
    if (existing) {
      if (row.student_id) existing.rows.push(row);
    } else {
      groups.set(row.session_id, {
        sessionId: row.session_id,
        className: row.class_name,
        teacherName: row.teacher_name,
        roomName: row.room_name,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        state: row.session_state,
        rows: row.student_id ? [row] : [],
      });
    }
  }
  return [...groups.values()].sort((a, b) => {
    const aUrgent = a.rows.some((row) => row.resolved_status === "needs_follow_up") ? 0 : 1;
    const bUrgent = b.rows.some((row) => row.resolved_status === "needs_follow_up") ? 0 : 1;
    return aUrgent - bUrgent || a.startsAt.localeCompare(b.startsAt);
  });
}

export function TodayAttendance() {
  const t = useTranslations();
  const { locale } = useLanguage();
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<AttendanceDayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    const result = await supabase.rpc("admin_attendance_day", { p_day: vietnamDateKey(new Date()) });
    if (result.error) setError(result.error.message);
    else {
      setRows((result.data as AttendanceDayRow[]) ?? []);
      setError("");
    }
    setLoading(false);
    setNow(new Date());
  }, [supabase]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(interval);
  }, [load]);

  async function mark(sessionId: string, studentId: string, status: string) {
    setBusy(`${sessionId}:${studentId}`);
    const result = await supabase.rpc("admin_mark_attendance", {
      p_session_id: sessionId,
      p_student_id: studentId,
      p_status: status,
    });
    if (result.error) setError(result.error.message);
    await load();
    setBusy("");
  }

  async function markAll(sessionId: string) {
    setBusy(`${sessionId}:all`);
    const result = await supabase.rpc("admin_mark_all_attendance", { p_session_id: sessionId });
    if (result.error) setError(result.error.message);
    await load();
    setBusy("");
  }

  const groups = groupRows(rows);

  return (
    <section className="attendance-view">
      <div className="attendance-view-title">
        <div><h2>{t("Today")}</h2><p>{vietnamDateKey(now)} {t(" · refreshes automatically")}</p></div>
        <button className="btn btn-secondary btn-small" type="button" onClick={() => void load()}>{t("Refresh")}</button>
      </div>
      {error ? <p className="attendance-error" role="alert">{t(error)}</p> : null}
      {loading ? <div className="attendance-card">{t("Loading today’s classes…")}</div> : null}
      {!loading && groups.length === 0 ? <div className="attendance-card attendance-empty"><h3>{t("No classes today")}</h3><p>{t("Add a class schedule or a one-off session in Classes.")}</p></div> : null}
      <div className="attendance-session-list">
        {groups.map((session) => {
          const windowState = getAttendanceWindow(now, new Date(session.startsAt), new Date(session.endsAt));
          const canBulk = session.state === "scheduled" && (windowState === "check_in_open" || windowState === "in_progress");
          const urgent = session.rows.filter((row) => row.resolved_status === "needs_follow_up");
          return (
            <article className={`attendance-card attendance-session${urgent.length ? " urgent" : ""}`} key={session.sessionId}>
              <header className="attendance-session-header">
                <div>
                  <span className={`attendance-badge ${urgent.length ? "needs_follow_up" : session.state}`}>{urgent.length ? t("{0} need follow-up", { 0: urgent.length }) : t(session.state)}</span>
                  <h3>{session.className}</h3>
                  <p>{formatVietnamTime(session.startsAt, locale)}–{formatVietnamTime(session.endsAt, locale)}{session.teacherName ? ` · ${session.teacherName}` : ""}{session.roomName ? ` · ${session.roomName}` : ""}</p>
                </div>
                {canBulk ? <button className="btn btn-primary btn-small" disabled={busy === `${session.sessionId}:all`} type="button" onClick={() => void markAll(session.sessionId)}>{t("Mark all remaining present")}</button> : null}
              </header>
              {session.rows.length === 0 ? <p className="attendance-empty-inline">{t("No enrolled students for this session.")}</p> : (
                <div className="attendance-student-list">
                  {session.rows.map((row) => {
                    const rowBusy = busy === `${session.sessionId}:${row.student_id}`;
                    const phone = row.parent_phone ? normalizeVietnamPhone(row.parent_phone) : null;
                    return (
                      <div className={`attendance-student-row ${row.resolved_status}`} key={row.student_id}>
                        <div className="attendance-student-details">
                          <strong>{row.full_name}</strong>
                          <span>{row.display_name}</span>
                          {row.resolved_status === "needs_follow_up" || row.resolved_status === "absent" ? <small>{row.parent_name} · {row.parent_phone}</small> : null}
                        </div>
                        <span className={`attendance-badge ${row.resolved_status}`}>{t(row.resolved_status.replaceAll("_", " "))}</span>
                        <div className="attendance-row-actions">
                          {row.resolved_status === "needs_follow_up" && phone ? <a className="btn btn-call btn-small" href={`tel:${phone}`}>{t("Call")}</a> : null}
                          {statuses.map((status) => <button key={status} type="button" disabled={rowBusy} className={`status-action ${status}${row.explicit_status === status ? " active" : ""}`} onClick={() => void mark(session.sessionId, row.student_id!, status)} title={t(status)} aria-label={t(status)}>{t(status)}</button>)}
                          <button type="button" disabled={rowBusy || !row.explicit_status} className="status-action clear" title={t("Clear attendance")} onClick={() => void mark(session.sessionId, row.student_id!, "clear")}>×</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
