import type { AttendanceStatus, ResolvedAttendanceStatus } from "@/lib/attendance";

export type AttendanceStudent = {
  id: string;
  full_name: string;
  display_name: string;
  parent_name: string;
  parent_phone: string;
  archived_at: string | null;
  created_at: string;
};

export type AttendanceClass = {
  id: string;
  name: string;
  teacher_name: string | null;
  room_name: string | null;
  term_start: string;
  term_end: string;
  archived_at: string | null;
  created_at: string;
};

export type AttendanceScheduleSlot = {
  id: string;
  class_id: string;
  iso_weekday: number;
  start_time: string;
  end_time: string;
  effective_from: string;
  effective_until: string;
};

export type AttendanceEnrollment = {
  id: string;
  class_id: string;
  student_id: string;
  start_date: string;
  end_date: string;
};

export type AttendanceSession = {
  id: string;
  class_id: string;
  schedule_slot_id: string | null;
  starts_at: string;
  ends_at: string;
  state: "scheduled" | "canceled";
  source: "recurring" | "manual";
  is_exception: boolean;
};

export type AttendanceDayRow = {
  session_id: string;
  class_id: string;
  class_name: string;
  teacher_name: string | null;
  room_name: string | null;
  starts_at: string;
  ends_at: string;
  session_state: "scheduled" | "canceled";
  student_id: string | null;
  full_name: string | null;
  display_name: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  explicit_status: AttendanceStatus | null;
  checked_in_at: string | null;
  resolved_status: ResolvedAttendanceStatus;
};

export type AttendanceHistoryRow = Pick<
  AttendanceDayRow,
  | "session_id"
  | "class_id"
  | "class_name"
  | "starts_at"
  | "ends_at"
  | "student_id"
  | "full_name"
  | "display_name"
  | "resolved_status"
  | "checked_in_at"
>;

export type PublicAttendanceSession = {
  session_id: string;
  class_name: string;
  teacher_name: string | null;
  room_name: string | null;
  starts_at: string;
  ends_at: string;
};

export type PublicAttendanceStudent = {
  student_id: string;
  display_name: string;
  checked_in: boolean;
};
