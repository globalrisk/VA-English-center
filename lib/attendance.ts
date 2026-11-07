export const ATTENDANCE_TIME_ZONE = "Asia/Ho_Chi_Minh";

export type AttendanceStatus = "present" | "late" | "absent" | "excused";
export type ResolvedAttendanceStatus =
  | AttendanceStatus
  | "needs_follow_up"
  | "unmarked"
  | "canceled";

export type AttendanceWindow =
  | "closed"
  | "check_in_open"
  | "in_progress"
  | "needs_follow_up"
  | "ended";

export function getAttendanceWindow(
  now: Date,
  startsAt: Date,
  endsAt: Date
): AttendanceWindow {
  const openAt = startsAt.getTime() - 15 * 60_000;
  const lateAt = startsAt.getTime() + 15 * 60_000;
  const current = now.getTime();

  if (current < openAt) return "closed";
  if (current < startsAt.getTime()) return "check_in_open";
  if (current < lateAt) return "in_progress";
  if (current < endsAt.getTime()) return "needs_follow_up";
  return "ended";
}

export function getAutomaticCheckInStatus(
  now: Date,
  startsAt: Date,
  endsAt: Date
): "present" | "late" | null {
  const window = getAttendanceWindow(now, startsAt, endsAt);
  if (window === "check_in_open" || window === "in_progress") return "present";
  if (window === "needs_follow_up") return "late";
  return null;
}

export function resolveAttendanceStatus(
  explicitStatus: AttendanceStatus | null,
  now: Date,
  startsAt: Date,
  endsAt: Date,
  canceled = false
): ResolvedAttendanceStatus {
  if (canceled) return "canceled";
  if (explicitStatus) return explicitStatus;
  const window = getAttendanceWindow(now, startsAt, endsAt);
  if (window === "ended") return "absent";
  if (window === "needs_follow_up") return "needs_follow_up";
  return "unmarked";
}

export function normalizeVietnamPhone(value: string): string | null {
  const compact = value.trim().replace(/[\s().-]/g, "");
  if (/^0\d{9}$/.test(compact)) return `+84${compact.slice(1)}`;
  if (/^84\d{9}$/.test(compact)) return `+${compact}`;
  if (/^\+84\d{9}$/.test(compact)) return compact;
  return null;
}

export function vietnamDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ATTENDANCE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function formatVietnamDateTime(value: string | Date, locale: "vi" | "en" = "vi"): string {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
    timeZone: ATTENDANCE_TIME_ZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatVietnamTime(value: string | Date, locale: "vi" | "en" = "vi"): string {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
    timeZone: ATTENDANCE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function toVietnamLocalInput(value: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ATTENDANCE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const item = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${item.year}-${item.month}-${item.day}T${item.hour}:${item.minute}`;
}

export function vietnamLocalInputToIso(value: string): string {
  return new Date(`${value}:00+07:00`).toISOString();
}

export function isStudentVisibleForSession(
  archivedAt: Date | null,
  sessionEndsAt: Date
): boolean {
  return archivedAt === null || sessionEndsAt.getTime() <= archivedAt.getTime();
}

export function canRegenerateSession(input: {
  source: "recurring" | "manual";
  isException: boolean;
  opensAt: Date;
  now: Date;
  hasAttendance: boolean;
}): boolean {
  return input.source === "recurring"
    && !input.isException
    && input.opensAt.getTime() > input.now.getTime()
    && !input.hasAttendance;
}
