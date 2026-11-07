import { describe, expect, it } from "vitest";
import {
  canRegenerateSession,
  getAutomaticCheckInStatus,
  getAttendanceWindow,
  isStudentVisibleForSession,
  normalizeVietnamPhone,
  resolveAttendanceStatus,
  vietnamDateKey,
  vietnamLocalInputToIso,
} from "./attendance";

const start = new Date("2026-09-12T02:00:00.000Z"); // 09:00 in Vietnam
const end = new Date("2026-09-12T03:00:00.000Z");

describe("attendance boundaries", () => {
  it("opens exactly 15 minutes before class", () => {
    expect(getAttendanceWindow(new Date("2026-09-12T01:44:59.999Z"), start, end)).toBe("closed");
    expect(getAttendanceWindow(new Date("2026-09-12T01:45:00.000Z"), start, end)).toBe("check_in_open");
  });

  it("switches new arrivals to late exactly at +15 minutes", () => {
    expect(getAutomaticCheckInStatus(new Date("2026-09-12T02:14:59.999Z"), start, end)).toBe("present");
    expect(getAutomaticCheckInStatus(new Date("2026-09-12T02:15:00.000Z"), start, end)).toBe("late");
    expect(resolveAttendanceStatus(null, new Date("2026-09-12T02:15:00.000Z"), start, end)).toBe("needs_follow_up");
  });

  it("closes at class end and resolves missing attendance to absent", () => {
    expect(getAutomaticCheckInStatus(end, start, end)).toBeNull();
    expect(resolveAttendanceStatus(null, end, start, end)).toBe("absent");
  });

  it("preserves explicit exceptions and cancellation", () => {
    expect(resolveAttendanceStatus("excused", end, start, end)).toBe("excused");
    expect(resolveAttendanceStatus(null, start, start, end, true)).toBe("canceled");
  });
});

describe("Vietnam formatting and phone validation", () => {
  it("calculates the calendar date in Asia/Ho_Chi_Minh", () => {
    expect(vietnamDateKey(new Date("2026-09-11T18:00:00.000Z"))).toBe("2026-09-12");
    expect(vietnamLocalInputToIso("2026-09-12T09:00")).toBe("2026-09-12T02:00:00.000Z");
  });

  it("normalizes supported Vietnam mobile formats", () => {
    expect(normalizeVietnamPhone("090 123 4567")).toBe("+84901234567");
    expect(normalizeVietnamPhone("84 901 234 567")).toBe("+84901234567");
    expect(normalizeVietnamPhone("+84 (901) 234-567")).toBe("+84901234567");
    expect(normalizeVietnamPhone("12345")).toBeNull();
  });
});

describe("schedule exceptions and archive behavior", () => {
  it("regenerates only untouched recurring sessions that have not opened", () => {
    const now = new Date("2026-09-12T01:00:00.000Z");
    const opensAt = new Date("2026-09-12T01:45:00.000Z");
    expect(canRegenerateSession({ source: "recurring", isException: false, opensAt, now, hasAttendance: false })).toBe(true);
    expect(canRegenerateSession({ source: "manual", isException: true, opensAt, now, hasAttendance: false })).toBe(false);
    expect(canRegenerateSession({ source: "recurring", isException: false, opensAt, now, hasAttendance: true })).toBe(false);
  });

  it("removes archived students from open/future rosters while preserving prior history", () => {
    const archivedAt = new Date("2026-09-12T04:00:00.000Z");
    expect(isStudentVisibleForSession(archivedAt, new Date("2026-09-12T03:00:00.000Z"))).toBe(true);
    expect(isStudentVisibleForSession(archivedAt, new Date("2026-09-12T05:00:00.000Z"))).toBe(false);
  });
});
