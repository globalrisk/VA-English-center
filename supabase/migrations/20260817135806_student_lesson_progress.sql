-- Persistent lesson progress and immutable course-completion awards.

CREATE TABLE public.lesson_completions (
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, lesson_id)
);

CREATE INDEX lesson_completions_lesson_id_idx
  ON public.lesson_completions (lesson_id);

CREATE TABLE public.course_completions (
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, course_id)
);

CREATE INDEX course_completions_course_id_idx
  ON public.course_completions (course_id);

CREATE INDEX IF NOT EXISTS lessons_course_id_idx
  ON public.lessons (course_id);

ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own lesson completions"
  ON public.lesson_completions FOR SELECT
  TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  );

CREATE POLICY "Students read own course completions"
  ON public.course_completions FOR SELECT
  TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  );

REVOKE ALL ON TABLE public.lesson_completions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.course_completions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.lesson_completions TO authenticated;
GRANT SELECT ON TABLE public.course_completions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lesson_completions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.course_completions TO service_role;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.record_lesson_completion_for_student(
  target_student_id uuid,
  target_lesson_id uuid,
  require_matching_auth boolean DEFAULT true
)
RETURNS TABLE (
  lesson_completed_at timestamptz,
  completed_course_id uuid,
  course_completed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  resolved_course_id uuid;
  resolved_lesson_completed_at timestamptz;
  resolved_course_completed_at timestamptz;
BEGIN
  IF target_student_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF require_matching_auth AND target_student_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'cannot complete a lesson for another student';
  END IF;

  SELECT l.course_id
  INTO resolved_course_id
  FROM public.lessons l
  JOIN public.course_age_groups cag ON cag.course_id = l.course_id
  JOIN public.profiles p
    ON p.id = target_student_id
   AND p.age_group = cag.age_group
   AND p.role = 'student'
  WHERE l.id = target_lesson_id
  LIMIT 1;

  IF resolved_course_id IS NULL THEN
    RAISE EXCEPTION 'lesson not found or not available';
  END IF;

  INSERT INTO public.lesson_completions (student_id, lesson_id)
  VALUES (target_student_id, target_lesson_id)
  ON CONFLICT (student_id, lesson_id) DO NOTHING;

  SELECT lc.completed_at
  INTO resolved_lesson_completed_at
  FROM public.lesson_completions lc
  WHERE lc.student_id = target_student_id
    AND lc.lesson_id = target_lesson_id;

  IF EXISTS (
    SELECT 1 FROM public.lessons l WHERE l.course_id = resolved_course_id
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.lessons l
    WHERE l.course_id = resolved_course_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.lesson_completions lc
        WHERE lc.student_id = target_student_id
          AND lc.lesson_id = l.id
      )
  ) THEN
    INSERT INTO public.course_completions (student_id, course_id)
    VALUES (target_student_id, resolved_course_id)
    ON CONFLICT (student_id, course_id) DO NOTHING;
  END IF;

  SELECT cc.completed_at
  INTO resolved_course_completed_at
  FROM public.course_completions cc
  WHERE cc.student_id = target_student_id
    AND cc.course_id = resolved_course_id;

  RETURN QUERY
  SELECT
    resolved_lesson_completed_at,
    resolved_course_id,
    resolved_course_completed_at;
END;
$$;

REVOKE ALL ON FUNCTION private.record_lesson_completion_for_student(uuid, uuid, boolean)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.mark_lesson_complete(target_lesson_id uuid)
RETURNS TABLE (
  lesson_id uuid,
  completed_at timestamptz,
  course_id uuid,
  course_completed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF public.is_admin() THEN
    RAISE EXCEPTION 'admin previews do not create lesson progress';
  END IF;

  RETURN QUERY
  SELECT
    target_lesson_id,
    progress.lesson_completed_at,
    progress.completed_course_id,
    progress.course_completed_at
  FROM private.record_lesson_completion_for_student(
    current_user_id,
    target_lesson_id,
    true
  ) AS progress;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_lesson_complete(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_lesson_complete(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.sync_submitted_test_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.submitted_at IS NOT NULL AND OLD.submitted_at IS NULL THEN
    PERFORM *
    FROM private.record_lesson_completion_for_student(
      NEW.student_id,
      NEW.lesson_id,
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_submitted_test_completion()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER sync_submitted_test_completion
AFTER UPDATE OF submitted_at ON public.test_attempts
FOR EACH ROW
WHEN (NEW.submitted_at IS NOT NULL AND OLD.submitted_at IS NULL)
EXECUTE FUNCTION private.sync_submitted_test_completion();

-- Existing submitted tests count as completed lessons.
INSERT INTO public.lesson_completions (student_id, lesson_id, completed_at)
SELECT ta.student_id, ta.lesson_id, ta.submitted_at
FROM public.test_attempts ta
JOIN public.profiles p ON p.id = ta.student_id AND p.role = 'student'
JOIN public.lessons l ON l.id = ta.lesson_id AND l.lesson_type = 'test'
WHERE ta.submitted_at IS NOT NULL
ON CONFLICT (student_id, lesson_id) DO NOTHING;

-- Preserve a completion award for any course already fully completed by the backfill.
INSERT INTO public.course_completions (student_id, course_id, completed_at)
SELECT
  lc.student_id,
  l.course_id,
  MAX(lc.completed_at)
FROM public.lesson_completions lc
JOIN public.lessons l ON l.id = lc.lesson_id
GROUP BY lc.student_id, l.course_id
HAVING COUNT(DISTINCT l.id) = (
  SELECT COUNT(*)
  FROM public.lessons all_lessons
  WHERE all_lessons.course_id = l.course_id
)
AND COUNT(DISTINCT l.id) > 0
ON CONFLICT (student_id, course_id) DO NOTHING;
