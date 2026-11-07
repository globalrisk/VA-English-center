BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(19);

SELECT ok(NOT has_table_privilege('anon', 'public.attendance_students', 'SELECT'), 'anon cannot select attendance students');
SELECT ok(NOT has_table_privilege('anon', 'public.attendance_classes', 'SELECT'), 'anon cannot select attendance classes');
SELECT ok(NOT has_table_privilege('anon', 'public.attendance_schedule_slots', 'SELECT'), 'anon cannot select schedule slots');
SELECT ok(NOT has_table_privilege('anon', 'public.attendance_enrollments', 'SELECT'), 'anon cannot select enrollments');
SELECT ok(NOT has_table_privilege('anon', 'public.attendance_sessions', 'SELECT'), 'anon cannot select sessions');
SELECT ok(NOT has_table_privilege('anon', 'public.attendance_records', 'SELECT'), 'anon cannot select attendance records');

SELECT ok(has_function_privilege('anon', 'public.public_open_attendance_sessions()', 'EXECUTE'), 'anon can list open sessions');
SELECT ok(has_function_privilege('anon', 'public.public_attendance_roster(uuid)', 'EXECUTE'), 'anon can list sanitized roster');
SELECT ok(has_function_privilege('anon', 'public.public_check_in(uuid,uuid)', 'EXECUTE'), 'anon can submit check-in');
SELECT ok(NOT has_function_privilege('anon', 'public.admin_attendance_day(date)', 'EXECUTE'), 'anon cannot call admin attendance');

SELECT throws_ok(
  $$ INSERT INTO public.attendance_students (full_name, display_name, parent_name, parent_phone) VALUES ('Invalid Phone', 'Invalid Phone', 'Parent', '12345') $$,
  '23514',
  'new row for relation "attendance_students" violates check constraint "attendance_students_parent_phone_check"',
  'invalid Vietnam phone numbers are rejected by the table constraint'
);

CREATE TEMP TABLE attendance_test_ids (class_id uuid, student_id uuid, session_id uuid, closed_session_id uuid);
WITH test_class AS (
  INSERT INTO public.attendance_classes (name, term_start, term_end)
  VALUES ('pgTAP Attendance', current_date, current_date + 1)
  RETURNING id
), test_student AS (
  INSERT INTO public.attendance_students (full_name, display_name, parent_name, parent_phone)
  VALUES ('Private Full Name', 'Public Name', 'Private Parent', '090 123 4567')
  RETURNING id
), open_session AS (
  INSERT INTO public.attendance_sessions (class_id, starts_at, ends_at, source, is_exception)
  SELECT id, now(), now() + interval '1 hour', 'manual', true FROM test_class
  RETURNING id, class_id
), closed_session AS (
  INSERT INTO public.attendance_sessions (class_id, starts_at, ends_at, source, is_exception)
  SELECT id, now() + interval '2 hours', now() + interval '3 hours', 'manual', true FROM test_class
  RETURNING id
), enrollment AS (
  INSERT INTO public.attendance_enrollments (class_id, student_id, start_date, end_date)
  SELECT test_class.id, test_student.id, current_date, current_date + 1
  FROM test_class, test_student
)
INSERT INTO attendance_test_ids
SELECT test_class.id, test_student.id, open_session.id, closed_session.id
FROM test_class, test_student, open_session, closed_session;

GRANT SELECT ON attendance_test_ids TO anon, authenticated;

SET LOCAL ROLE anon;

SELECT results_eq(
  $$ SELECT key FROM public.public_attendance_roster((SELECT session_id FROM attendance_test_ids)) AS roster, LATERAL jsonb_object_keys(to_jsonb(roster)) AS key ORDER BY key $$,
  $$ VALUES ('checked_in'::text), ('display_name'::text), ('student_id'::text) $$,
  'public roster exposes only sanitized fields'
);

SELECT results_eq(
  $$ SELECT display_name FROM public.public_attendance_roster((SELECT session_id FROM attendance_test_ids)) $$,
  $$ VALUES ('Public Name'::text) $$,
  'public roster exposes display name, not full or parent data'
);

SELECT throws_ok(
  $$ SELECT public.public_check_in((SELECT closed_session_id FROM attendance_test_ids), (SELECT student_id FROM attendance_test_ids)) $$,
  '22023',
  'Check-in is not open for this class.',
  'check-in outside the open window is rejected'
);

SELECT lives_ok(
  $$ SELECT public.public_check_in((SELECT session_id FROM attendance_test_ids), (SELECT student_id FROM attendance_test_ids)) $$,
  'first valid anonymous check-in succeeds'
);
SELECT lives_ok(
  $$ SELECT public.public_check_in((SELECT session_id FROM attendance_test_ids), (SELECT student_id FROM attendance_test_ids)) $$,
  'duplicate anonymous check-in is idempotent'
);

RESET ROLE;

SELECT is(
  (SELECT count(*) FROM public.attendance_records WHERE session_id = (SELECT session_id FROM attendance_test_ids)),
  1::bigint,
  'duplicate check-in creates one record'
);
SELECT is(
  (SELECT status::text FROM public.attendance_records WHERE session_id = (SELECT session_id FROM attendance_test_ids)),
  'present',
  'database time resolves an on-time arrival to present'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
SELECT throws_ok(
  $$ SELECT public.admin_attendance_day(current_date) $$,
  '42501',
  'not authorized',
  'non-admin authenticated users are rejected by admin RPCs'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
