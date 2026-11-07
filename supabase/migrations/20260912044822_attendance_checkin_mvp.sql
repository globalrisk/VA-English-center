-- Attendance check-in MVP
-- Physical classes and attendance are intentionally separate from learning courses/profiles.

CREATE TYPE public.attendance_status AS ENUM ('present', 'late', 'absent', 'excused');
CREATE TYPE public.attendance_session_state AS ENUM ('scheduled', 'canceled');
CREATE TYPE public.attendance_session_source AS ENUM ('recurring', 'manual');

CREATE TABLE public.attendance_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (btrim(full_name) <> ''),
  display_name text NOT NULL CHECK (btrim(display_name) <> ''),
  parent_name text NOT NULL CHECK (btrim(parent_name) <> ''),
  parent_phone text NOT NULL CHECK (
    parent_phone ~ '^[+0-9][0-9 .()-]{6,24}$'
  ),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.attendance_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  teacher_name text,
  room_name text,
  term_start date NOT NULL,
  term_end date NOT NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (term_end >= term_start),
  CHECK (teacher_name IS NULL OR btrim(teacher_name) <> ''),
  CHECK (room_name IS NULL OR btrim(room_name) <> '')
);

CREATE TABLE public.attendance_schedule_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.attendance_classes(id) ON DELETE CASCADE,
  iso_weekday smallint NOT NULL CHECK (iso_weekday BETWEEN 1 AND 7),
  start_time time NOT NULL,
  end_time time NOT NULL,
  effective_from date NOT NULL,
  effective_until date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  CHECK (effective_until >= effective_from)
);

CREATE TABLE public.attendance_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.attendance_classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.attendance_students(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  UNIQUE (class_id, student_id, start_date)
);

CREATE TABLE public.attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.attendance_classes(id) ON DELETE CASCADE,
  schedule_slot_id uuid REFERENCES public.attendance_schedule_slots(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  state public.attendance_session_state NOT NULL DEFAULT 'scheduled',
  source public.attendance_session_source NOT NULL DEFAULT 'recurring',
  is_exception boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  UNIQUE (class_id, starts_at)
);

CREATE TABLE public.attendance_records (
  session_id uuid NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.attendance_students(id) ON DELETE RESTRICT,
  status public.attendance_status NOT NULL,
  checked_in_at timestamptz,
  PRIMARY KEY (session_id, student_id),
  CHECK (
    (status IN ('present', 'late') AND checked_in_at IS NOT NULL)
    OR (status IN ('absent', 'excused') AND checked_in_at IS NULL)
  )
);

CREATE INDEX attendance_students_active_display_name_idx
  ON public.attendance_students (lower(display_name))
  WHERE archived_at IS NULL;
CREATE INDEX attendance_schedule_slots_class_id_idx
  ON public.attendance_schedule_slots (class_id);
CREATE INDEX attendance_enrollments_class_dates_idx
  ON public.attendance_enrollments (class_id, start_date, end_date);
CREATE INDEX attendance_enrollments_student_id_idx
  ON public.attendance_enrollments (student_id);
CREATE INDEX attendance_sessions_class_starts_at_idx
  ON public.attendance_sessions (class_id, starts_at);
CREATE INDEX attendance_sessions_starts_at_state_idx
  ON public.attendance_sessions (starts_at, state);
CREATE INDEX attendance_sessions_schedule_slot_id_idx
  ON public.attendance_sessions (schedule_slot_id)
  WHERE schedule_slot_id IS NOT NULL;
CREATE INDEX attendance_records_student_id_idx
  ON public.attendance_records (student_id);

ALTER TABLE public.attendance_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_schedule_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.attendance_students,
  public.attendance_classes,
  public.attendance_schedule_slots,
  public.attendance_enrollments,
  public.attendance_sessions,
  public.attendance_records
FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.attendance_students,
  public.attendance_classes,
  public.attendance_schedule_slots,
  public.attendance_enrollments,
  public.attendance_sessions,
  public.attendance_records
TO authenticated;

CREATE POLICY "Admins read attendance students"
  ON public.attendance_students FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));
CREATE POLICY "Admins create attendance students"
  ON public.attendance_students FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins update attendance students"
  ON public.attendance_students FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins delete attendance students"
  ON public.attendance_students FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY "Admins read attendance classes"
  ON public.attendance_classes FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));
CREATE POLICY "Admins create attendance classes"
  ON public.attendance_classes FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins update attendance classes"
  ON public.attendance_classes FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins delete attendance classes"
  ON public.attendance_classes FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY "Admins read attendance schedule slots"
  ON public.attendance_schedule_slots FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));
CREATE POLICY "Admins create attendance schedule slots"
  ON public.attendance_schedule_slots FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins update attendance schedule slots"
  ON public.attendance_schedule_slots FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins delete attendance schedule slots"
  ON public.attendance_schedule_slots FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY "Admins read attendance enrollments"
  ON public.attendance_enrollments FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));
CREATE POLICY "Admins create attendance enrollments"
  ON public.attendance_enrollments FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins update attendance enrollments"
  ON public.attendance_enrollments FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins delete attendance enrollments"
  ON public.attendance_enrollments FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY "Admins read attendance sessions"
  ON public.attendance_sessions FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));
CREATE POLICY "Admins create attendance sessions"
  ON public.attendance_sessions FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins update attendance sessions"
  ON public.attendance_sessions FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins delete attendance sessions"
  ON public.attendance_sessions FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY "Admins read attendance records"
  ON public.attendance_records FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));
CREATE POLICY "Admins create attendance records"
  ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins update attendance records"
  ON public.attendance_records FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins delete attendance records"
  ON public.attendance_records FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

-- Public read APIs intentionally use SECURITY DEFINER so the base tables can stay private.
CREATE FUNCTION public.public_open_attendance_sessions()
RETURNS TABLE (
  session_id uuid,
  class_name text,
  teacher_name text,
  room_name text,
  starts_at timestamptz,
  ends_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    s.id,
    c.name,
    c.teacher_name,
    c.room_name,
    s.starts_at,
    s.ends_at
  FROM public.attendance_sessions AS s
  JOIN public.attendance_classes AS c ON c.id = s.class_id
  WHERE s.state = 'scheduled'::public.attendance_session_state
    AND c.archived_at IS NULL
    AND now() >= s.starts_at - interval '15 minutes'
    AND now() < s.ends_at
  ORDER BY s.starts_at, c.name;
$$;

CREATE FUNCTION public.public_attendance_roster(p_session_id uuid)
RETURNS TABLE (
  student_id uuid,
  display_name text,
  checked_in boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    student.id,
    student.display_name,
    record.status IN ('present'::public.attendance_status, 'late'::public.attendance_status)
  FROM public.attendance_sessions AS session
  JOIN public.attendance_classes AS class ON class.id = session.class_id
  JOIN public.attendance_enrollments AS enrollment
    ON enrollment.class_id = session.class_id
   AND (session.starts_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
       BETWEEN enrollment.start_date AND enrollment.end_date
  JOIN public.attendance_students AS student ON student.id = enrollment.student_id
  LEFT JOIN public.attendance_records AS record
    ON record.session_id = session.id
   AND record.student_id = student.id
  WHERE session.id = p_session_id
    AND session.state = 'scheduled'::public.attendance_session_state
    AND class.archived_at IS NULL
    AND student.archived_at IS NULL
    AND now() >= session.starts_at - interval '15 minutes'
    AND now() < session.ends_at
    AND (
      record.status IS NULL
      OR record.status IN ('present'::public.attendance_status, 'late'::public.attendance_status)
    )
  ORDER BY lower(student.display_name), student.id;
$$;

CREATE FUNCTION public.public_check_in(p_session_id uuid, p_student_id uuid)
RETURNS TABLE (checked_in boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_session public.attendance_sessions%ROWTYPE;
  existing_status public.attendance_status;
  check_in_status public.attendance_status;
BEGIN
  SELECT session.*
  INTO target_session
  FROM public.attendance_sessions AS session
  JOIN public.attendance_classes AS class ON class.id = session.class_id
  WHERE session.id = p_session_id
    AND session.state = 'scheduled'::public.attendance_session_state
    AND class.archived_at IS NULL
    AND now() >= session.starts_at - interval '15 minutes'
    AND now() < session.ends_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Check-in is not open for this class.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.attendance_enrollments AS enrollment
    JOIN public.attendance_students AS student ON student.id = enrollment.student_id
    WHERE enrollment.class_id = target_session.class_id
      AND enrollment.student_id = p_student_id
      AND student.archived_at IS NULL
      AND (target_session.starts_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
          BETWEEN enrollment.start_date AND enrollment.end_date
  ) THEN
    RAISE EXCEPTION 'Student is not on this class roster.' USING ERRCODE = '22023';
  END IF;

  SELECT record.status
  INTO existing_status
  FROM public.attendance_records AS record
  WHERE record.session_id = p_session_id
    AND record.student_id = p_student_id;

  IF FOUND THEN
    IF existing_status IN ('present'::public.attendance_status, 'late'::public.attendance_status) THEN
      RETURN QUERY SELECT true;
      RETURN;
    END IF;

    RAISE EXCEPTION 'Check-in is unavailable. Please see the administrator.' USING ERRCODE = '22023';
  END IF;

  check_in_status := CASE
    WHEN now() >= target_session.starts_at + interval '15 minutes'
      THEN 'late'::public.attendance_status
    ELSE 'present'::public.attendance_status
  END;

  INSERT INTO public.attendance_records (session_id, student_id, status, checked_in_at)
  VALUES (p_session_id, p_student_id, check_in_status, now())
  ON CONFLICT (session_id, student_id) DO NOTHING;

  SELECT record.status
  INTO existing_status
  FROM public.attendance_records AS record
  WHERE record.session_id = p_session_id
    AND record.student_id = p_student_id;

  IF existing_status NOT IN ('present'::public.attendance_status, 'late'::public.attendance_status) THEN
    RAISE EXCEPTION 'Check-in is unavailable. Please see the administrator.' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY SELECT true;
END;
$$;

CREATE FUNCTION public.admin_save_attendance_class(
  p_class_id uuid,
  p_name text,
  p_teacher_name text,
  p_room_name text,
  p_term_start date,
  p_term_end date,
  p_effective_date date,
  p_slots jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  saved_class_id uuid;
  effective_date date;
  slot record;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF btrim(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Class name is required.' USING ERRCODE = '22023';
  END IF;
  IF p_term_end < p_term_start THEN
    RAISE EXCEPTION 'Term end must be on or after term start.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_slots) <> 'array' OR jsonb_array_length(p_slots) = 0 THEN
    RAISE EXCEPTION 'At least one weekly time slot is required.' USING ERRCODE = '22023';
  END IF;

  effective_date := GREATEST(COALESCE(p_effective_date, p_term_start), p_term_start);
  IF effective_date > p_term_end THEN
    RAISE EXCEPTION 'Schedule effective date must be within the class term.' USING ERRCODE = '22023';
  END IF;
  IF p_class_id IS NOT NULL
     AND effective_date < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN
    RAISE EXCEPTION 'Schedule changes cannot start in the past.' USING ERRCODE = '22023';
  END IF;

  IF p_class_id IS NULL THEN
    INSERT INTO public.attendance_classes (
      name, teacher_name, room_name, term_start, term_end
    ) VALUES (
      btrim(p_name), NULLIF(btrim(p_teacher_name), ''), NULLIF(btrim(p_room_name), ''),
      p_term_start, p_term_end
    )
    RETURNING id INTO saved_class_id;
    effective_date := p_term_start;
  ELSE
    UPDATE public.attendance_classes
    SET name = btrim(p_name),
        teacher_name = NULLIF(btrim(p_teacher_name), ''),
        room_name = NULLIF(btrim(p_room_name), ''),
        term_start = p_term_start,
        term_end = p_term_end
    WHERE id = p_class_id
    RETURNING id INTO saved_class_id;

    IF saved_class_id IS NULL THEN
      RAISE EXCEPTION 'Attendance class not found.' USING ERRCODE = '22023';
    END IF;

    UPDATE public.attendance_sessions AS session
    SET state = 'canceled'::public.attendance_session_state,
        is_exception = true
    WHERE session.class_id = saved_class_id
      AND session.state = 'scheduled'::public.attendance_session_state
      AND session.starts_at - interval '15 minutes' > now()
      AND (
        (session.starts_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date < p_term_start
        OR (session.starts_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date > p_term_end
      );

    DELETE FROM public.attendance_sessions AS session
    WHERE session.class_id = saved_class_id
      AND session.source = 'recurring'::public.attendance_session_source
      AND session.is_exception = false
      AND session.starts_at - interval '15 minutes' > now()
      AND (session.starts_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= effective_date
      AND NOT EXISTS (
        SELECT 1 FROM public.attendance_records AS record
        WHERE record.session_id = session.id
      );

    DELETE FROM public.attendance_schedule_slots
    WHERE class_id = saved_class_id
      AND effective_from >= effective_date;

    UPDATE public.attendance_schedule_slots
    SET effective_until = effective_date - 1
    WHERE class_id = saved_class_id
      AND effective_from < effective_date
      AND effective_until >= effective_date;
  END IF;

  FOR slot IN
    SELECT parsed.iso_weekday, parsed.start_time, parsed.end_time
    FROM jsonb_to_recordset(p_slots) AS parsed(
      iso_weekday smallint,
      start_time time,
      end_time time
    )
  LOOP
    IF slot.iso_weekday NOT BETWEEN 1 AND 7 OR slot.end_time <= slot.start_time THEN
      RAISE EXCEPTION 'Each weekly slot needs a valid weekday and end time after start time.'
        USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.attendance_schedule_slots (
      class_id, iso_weekday, start_time, end_time, effective_from, effective_until
    ) VALUES (
      saved_class_id,
      slot.iso_weekday,
      slot.start_time,
      slot.end_time,
      effective_date,
      p_term_end
    );
  END LOOP;

  INSERT INTO public.attendance_sessions (
    class_id, schedule_slot_id, starts_at, ends_at, state, source, is_exception
  )
  SELECT
    saved_class_id,
    schedule.id,
    (day_value::date + schedule.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh',
    (day_value::date + schedule.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh',
    'scheduled'::public.attendance_session_state,
    'recurring'::public.attendance_session_source,
    false
  FROM public.attendance_schedule_slots AS schedule
  CROSS JOIN LATERAL generate_series(
    0,
    LEAST(schedule.effective_until, p_term_end)
      - GREATEST(schedule.effective_from, p_term_start)
  ) AS generated(day_offset)
  CROSS JOIN LATERAL (
    SELECT GREATEST(schedule.effective_from, p_term_start) + day_offset AS day_value
  ) AS generated_date
  WHERE schedule.class_id = saved_class_id
    AND EXTRACT(ISODOW FROM day_value) = schedule.iso_weekday
  ON CONFLICT (class_id, starts_at) DO NOTHING;

  RETURN saved_class_id;
END;
$$;

CREATE FUNCTION public.admin_set_attendance_student_archived(
  p_student_id uuid,
  p_archived boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.attendance_students
  SET archived_at = CASE WHEN p_archived THEN now() ELSE NULL END
  WHERE id = p_student_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attendance student not found.' USING ERRCODE = '22023';
  END IF;
END;
$$;

CREATE FUNCTION public.admin_set_attendance_class_archived(
  p_class_id uuid,
  p_archived boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.attendance_classes
  SET archived_at = CASE WHEN p_archived THEN now() ELSE NULL END
  WHERE id = p_class_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attendance class not found.' USING ERRCODE = '22023';
  END IF;

  IF p_archived THEN
    UPDATE public.attendance_sessions
    SET state = 'canceled'::public.attendance_session_state,
        is_exception = true
    WHERE class_id = p_class_id
      AND state = 'scheduled'::public.attendance_session_state
      AND starts_at > now();
  END IF;
END;
$$;

CREATE FUNCTION public.admin_change_attendance_session(
  p_action text,
  p_session_id uuid DEFAULT NULL,
  p_class_id uuid DEFAULT NULL,
  p_starts_at timestamptz DEFAULT NULL,
  p_ends_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  saved_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_action = 'cancel' THEN
    UPDATE public.attendance_sessions
    SET state = 'canceled'::public.attendance_session_state,
        is_exception = true
    WHERE id = p_session_id
    RETURNING id INTO saved_id;
  ELSIF p_action = 'reschedule' THEN
    IF p_starts_at IS NULL OR p_ends_at IS NULL OR p_ends_at <= p_starts_at THEN
      RAISE EXCEPTION 'A valid start and end time are required.' USING ERRCODE = '22023';
    END IF;
    UPDATE public.attendance_sessions
    SET starts_at = p_starts_at,
        ends_at = p_ends_at,
        state = 'scheduled'::public.attendance_session_state,
        is_exception = true
    WHERE id = p_session_id
      AND starts_at - interval '15 minutes' > now()
    RETURNING id INTO saved_id;
  ELSIF p_action = 'add' THEN
    IF p_class_id IS NULL OR p_starts_at IS NULL OR p_ends_at IS NULL OR p_ends_at <= p_starts_at THEN
      RAISE EXCEPTION 'Class and valid start/end times are required.' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.attendance_sessions (
      class_id, starts_at, ends_at, state, source, is_exception
    ) VALUES (
      p_class_id, p_starts_at, p_ends_at,
      'scheduled'::public.attendance_session_state,
      'manual'::public.attendance_session_source,
      true
    )
    RETURNING id INTO saved_id;
  ELSE
    RAISE EXCEPTION 'Unknown session action.' USING ERRCODE = '22023';
  END IF;

  IF saved_id IS NULL THEN
    RAISE EXCEPTION 'Attendance session not found or can no longer be changed.' USING ERRCODE = '22023';
  END IF;

  RETURN saved_id;
END;
$$;

CREATE FUNCTION public.admin_save_attendance_enrollment(
  p_enrollment_id uuid,
  p_class_id uuid,
  p_student_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  saved_id uuid;
  student_label text;
  class_start date;
  class_end date;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Enrollment end must be on or after its start.' USING ERRCODE = '22023';
  END IF;

  SELECT display_name INTO student_label
  FROM public.attendance_students
  WHERE id = p_student_id AND archived_at IS NULL;
  IF student_label IS NULL THEN
    RAISE EXCEPTION 'Active attendance student not found.' USING ERRCODE = '22023';
  END IF;

  SELECT term_start, term_end INTO class_start, class_end
  FROM public.attendance_classes
  WHERE id = p_class_id AND archived_at IS NULL;
  IF class_start IS NULL THEN
    RAISE EXCEPTION 'Active attendance class not found.' USING ERRCODE = '22023';
  END IF;
  IF p_start_date < class_start OR p_end_date > class_end THEN
    RAISE EXCEPTION 'Enrollment dates must stay within the class term.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.attendance_enrollments AS enrollment
    WHERE enrollment.class_id = p_class_id
      AND enrollment.student_id = p_student_id
      AND enrollment.id <> COALESCE(p_enrollment_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND daterange(enrollment.start_date, enrollment.end_date, '[]')
          && daterange(p_start_date, p_end_date, '[]')
  ) THEN
    RAISE EXCEPTION 'This student already has an overlapping enrollment in the class.'
      USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.attendance_enrollments AS enrollment
    JOIN public.attendance_students AS other_student ON other_student.id = enrollment.student_id
    WHERE enrollment.class_id = p_class_id
      AND enrollment.student_id <> p_student_id
      AND enrollment.id <> COALESCE(p_enrollment_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND lower(other_student.display_name) = lower(student_label)
      AND daterange(enrollment.start_date, enrollment.end_date, '[]')
          && daterange(p_start_date, p_end_date, '[]')
  ) THEN
    RAISE EXCEPTION 'Public display names must be unique within overlapping class enrollments.'
      USING ERRCODE = '23505';
  END IF;

  IF p_enrollment_id IS NULL THEN
    INSERT INTO public.attendance_enrollments (class_id, student_id, start_date, end_date)
    VALUES (p_class_id, p_student_id, p_start_date, p_end_date)
    RETURNING id INTO saved_id;
  ELSE
    UPDATE public.attendance_enrollments
    SET class_id = p_class_id,
        student_id = p_student_id,
        start_date = p_start_date,
        end_date = p_end_date
    WHERE id = p_enrollment_id
    RETURNING id INTO saved_id;

    IF saved_id IS NULL THEN
      RAISE EXCEPTION 'Attendance enrollment not found.' USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN saved_id;
END;
$$;

CREATE FUNCTION public.admin_attendance_day(p_day date)
RETURNS TABLE (
  session_id uuid,
  class_id uuid,
  class_name text,
  teacher_name text,
  room_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  session_state public.attendance_session_state,
  student_id uuid,
  full_name text,
  display_name text,
  parent_name text,
  parent_phone text,
  explicit_status public.attendance_status,
  checked_in_at timestamptz,
  resolved_status text
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    session.id,
    class.id,
    class.name,
    class.teacher_name,
    class.room_name,
    session.starts_at,
    session.ends_at,
    session.state,
    student.id,
    student.full_name,
    student.display_name,
    student.parent_name,
    student.parent_phone,
    record.status,
    record.checked_in_at,
    CASE
      WHEN session.state = 'canceled'::public.attendance_session_state THEN 'canceled'
      WHEN record.status IS NOT NULL THEN record.status::text
      WHEN now() >= session.ends_at THEN 'absent'
      WHEN now() >= session.starts_at + interval '15 minutes' THEN 'needs_follow_up'
      ELSE 'unmarked'
    END
  FROM public.attendance_sessions AS session
  JOIN public.attendance_classes AS class ON class.id = session.class_id
  LEFT JOIN public.attendance_enrollments AS enrollment
    ON enrollment.class_id = session.class_id
   AND (session.starts_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
       BETWEEN enrollment.start_date AND enrollment.end_date
  LEFT JOIN public.attendance_students AS student
    ON student.id = enrollment.student_id
   AND (student.archived_at IS NULL OR session.ends_at <= student.archived_at)
  LEFT JOIN public.attendance_records AS record
    ON record.session_id = session.id
   AND record.student_id = student.id
  WHERE (session.starts_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = p_day
  ORDER BY session.starts_at, class.name, lower(student.display_name);
END;
$$;

CREATE FUNCTION public.admin_attendance_history(
  p_from date,
  p_to date,
  p_class_id uuid DEFAULT NULL,
  p_student_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS TABLE (
  session_id uuid,
  class_id uuid,
  class_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  student_id uuid,
  full_name text,
  display_name text,
  resolved_status text,
  checked_in_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH history AS (
    SELECT
      session.id AS session_id,
      class.id AS class_id,
      class.name AS class_name,
      session.starts_at,
      session.ends_at,
      student.id AS student_id,
      student.full_name,
      student.display_name,
      CASE
        WHEN session.state = 'canceled'::public.attendance_session_state THEN 'canceled'
        WHEN record.status IS NOT NULL THEN record.status::text
        WHEN now() >= session.ends_at THEN 'absent'
        WHEN now() >= session.starts_at + interval '15 minutes' THEN 'needs_follow_up'
        ELSE 'unmarked'
      END AS resolved_status,
      record.checked_in_at
    FROM public.attendance_sessions AS session
    JOIN public.attendance_classes AS class ON class.id = session.class_id
    JOIN public.attendance_enrollments AS enrollment
      ON enrollment.class_id = session.class_id
     AND (session.starts_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
         BETWEEN enrollment.start_date AND enrollment.end_date
    JOIN public.attendance_students AS student
      ON student.id = enrollment.student_id
     AND (student.archived_at IS NULL OR session.ends_at <= student.archived_at)
    LEFT JOIN public.attendance_records AS record
      ON record.session_id = session.id
     AND record.student_id = student.id
    WHERE (session.starts_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN p_from AND p_to
      AND (p_class_id IS NULL OR class.id = p_class_id)
      AND (p_student_id IS NULL OR student.id = p_student_id)
  )
  SELECT history.*
  FROM history
  WHERE p_status IS NULL OR history.resolved_status = p_status
  ORDER BY history.starts_at DESC, history.class_name, lower(history.display_name);
END;
$$;

CREATE FUNCTION public.admin_mark_attendance(
  p_session_id uuid,
  p_student_id uuid,
  p_status text
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  session_start timestamptz;
  session_end timestamptz;
  resolved public.attendance_status;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT starts_at, ends_at INTO session_start, session_end
  FROM public.attendance_sessions
  WHERE id = p_session_id
    AND state = 'scheduled'::public.attendance_session_state;
  IF session_start IS NULL THEN
    RAISE EXCEPTION 'Scheduled attendance session not found.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.attendance_enrollments
    WHERE class_id = (SELECT class_id FROM public.attendance_sessions WHERE id = p_session_id)
      AND student_id = p_student_id
      AND (session_start AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN start_date AND end_date
  ) THEN
    RAISE EXCEPTION 'Student is not on this class roster.' USING ERRCODE = '22023';
  END IF;

  IF p_status = 'clear' THEN
    DELETE FROM public.attendance_records
    WHERE session_id = p_session_id AND student_id = p_student_id;
    RETURN 'cleared';
  END IF;

  IF p_status = 'auto' THEN
    IF now() < session_start - interval '15 minutes' OR now() >= session_end THEN
      RAISE EXCEPTION 'Quick check-in is outside the attendance window.' USING ERRCODE = '22023';
    END IF;
    resolved := CASE
      WHEN now() >= session_start + interval '15 minutes'
        THEN 'late'::public.attendance_status
      ELSE 'present'::public.attendance_status
    END;
  ELSIF p_status IN ('present', 'late', 'absent', 'excused') THEN
    resolved := p_status::public.attendance_status;
  ELSE
    RAISE EXCEPTION 'Unknown attendance status.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.attendance_records (session_id, student_id, status, checked_in_at)
  VALUES (
    p_session_id,
    p_student_id,
    resolved,
    CASE WHEN resolved IN ('present', 'late') THEN now() ELSE NULL END
  )
  ON CONFLICT (session_id, student_id) DO UPDATE
  SET status = EXCLUDED.status,
      checked_in_at = EXCLUDED.checked_in_at;

  RETURN resolved::text;
END;
$$;

CREATE FUNCTION public.admin_mark_all_attendance(p_session_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  target_session public.attendance_sessions%ROWTYPE;
  marked_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target_session
  FROM public.attendance_sessions
  WHERE id = p_session_id
    AND state = 'scheduled'::public.attendance_session_state;

  IF NOT FOUND
     OR now() < target_session.starts_at - interval '15 minutes'
     OR now() >= target_session.starts_at + interval '15 minutes' THEN
    RAISE EXCEPTION 'Bulk attendance is available only from 15 minutes before start until the follow-up threshold.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.attendance_records (session_id, student_id, status, checked_in_at)
  SELECT
    target_session.id,
    enrollment.student_id,
    'present'::public.attendance_status,
    now()
  FROM public.attendance_enrollments AS enrollment
  JOIN public.attendance_students AS student ON student.id = enrollment.student_id
  WHERE enrollment.class_id = target_session.class_id
    AND student.archived_at IS NULL
    AND (target_session.starts_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
        BETWEEN enrollment.start_date AND enrollment.end_date
    AND NOT EXISTS (
      SELECT 1 FROM public.attendance_records AS record
      WHERE record.session_id = target_session.id
        AND record.student_id = enrollment.student_id
    )
  ON CONFLICT (session_id, student_id) DO NOTHING;

  GET DIAGNOSTICS marked_count = ROW_COUNT;
  RETURN marked_count;
END;
$$;

REVOKE ALL ON FUNCTION public.public_open_attendance_sessions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.public_attendance_roster(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.public_check_in(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_open_attendance_sessions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_attendance_roster(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_check_in(uuid, uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_save_attendance_class(uuid, text, text, text, date, date, date, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_save_attendance_enrollment(uuid, uuid, uuid, date, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_attendance_day(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_attendance_history(date, date, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_mark_attendance(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_mark_all_attendance(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_attendance_student_archived(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_attendance_class_archived(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_change_attendance_session(text, uuid, uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_attendance_class(uuid, text, text, text, date, date, date, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_attendance_enrollment(uuid, uuid, uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_attendance_day(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_attendance_history(date, date, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_attendance(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_all_attendance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_attendance_student_archived(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_attendance_class_archived(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_change_attendance_session(text, uuid, uuid, timestamptz, timestamptz) TO authenticated;
