-- Prepared rollback for the attendance MVP migration.
-- Do not run unless the additive migration creates a blocking problem.

BEGIN;

DROP FUNCTION IF EXISTS public.admin_change_attendance_session(text, uuid, uuid, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.admin_set_attendance_class_archived(uuid, boolean);
DROP FUNCTION IF EXISTS public.admin_set_attendance_student_archived(uuid, boolean);
DROP FUNCTION IF EXISTS public.admin_mark_all_attendance(uuid);
DROP FUNCTION IF EXISTS public.admin_mark_attendance(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.admin_attendance_history(date, date, uuid, uuid, text);
DROP FUNCTION IF EXISTS public.admin_attendance_day(date);
DROP FUNCTION IF EXISTS public.admin_save_attendance_enrollment(uuid, uuid, uuid, date, date);
DROP FUNCTION IF EXISTS public.admin_save_attendance_class(uuid, text, text, text, date, date, date, jsonb);
DROP FUNCTION IF EXISTS public.public_check_in(uuid, uuid);
DROP FUNCTION IF EXISTS public.public_attendance_roster(uuid);
DROP FUNCTION IF EXISTS public.public_open_attendance_sessions();

DROP TABLE IF EXISTS public.attendance_records;
DROP TABLE IF EXISTS public.attendance_sessions;
DROP TABLE IF EXISTS public.attendance_enrollments;
DROP TABLE IF EXISTS public.attendance_schedule_slots;
DROP TABLE IF EXISTS public.attendance_classes;
DROP TABLE IF EXISTS public.attendance_students;

DROP TYPE IF EXISTS public.attendance_session_source;
DROP TYPE IF EXISTS public.attendance_session_state;
DROP TYPE IF EXISTS public.attendance_status;

COMMIT;
