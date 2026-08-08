-- Permanent first-attempt scores for timed test lessons.

CREATE TABLE IF NOT EXISTS public.test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  time_limit_minutes int NOT NULL CHECK (time_limit_minutes BETWEEN 1 AND 240),
  submitted_at timestamptz,
  correct_count int CHECK (correct_count IS NULL OR correct_count >= 0),
  total_questions int CHECK (total_questions IS NULL OR total_questions > 0),
  percentage numeric(5, 2) CHECK (
    percentage IS NULL OR (percentage >= 0 AND percentage <= 100)
  ),
  elapsed_seconds int CHECK (elapsed_seconds IS NULL OR elapsed_seconds >= 0),
  UNIQUE (student_id, lesson_id),
  CHECK (
    (submitted_at IS NULL AND correct_count IS NULL AND total_questions IS NULL
      AND percentage IS NULL AND elapsed_seconds IS NULL)
    OR
    (submitted_at IS NOT NULL AND correct_count IS NOT NULL
      AND total_questions IS NOT NULL AND percentage IS NOT NULL
      AND elapsed_seconds IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS test_attempts_student_id_idx
  ON public.test_attempts(student_id);
CREATE INDEX IF NOT EXISTS test_attempts_lesson_id_idx
  ON public.test_attempts(lesson_id);

ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students read own test attempts" ON public.test_attempts;
CREATE POLICY "Students read own test attempts"
  ON public.test_attempts FOR SELECT
  TO authenticated
  USING (student_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.start_test_attempt(test_lesson_id uuid)
RETURNS TABLE (
  id uuid,
  student_id uuid,
  lesson_id uuid,
  started_at timestamptz,
  time_limit_minutes int,
  submitted_at timestamptz,
  correct_count int,
  total_questions int,
  percentage numeric,
  elapsed_seconds int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  configured_minutes int;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF public.is_admin() THEN
    RAISE EXCEPTION 'admin previews do not create test attempts';
  END IF;

  SELECT CASE
    WHEN COALESCE(l.test_content->>'timeLimitMinutes', '') ~ '^[0-9]+$'
      THEN LEAST(GREATEST((l.test_content->>'timeLimitMinutes')::int, 1), 240)
    ELSE 30
  END
  INTO configured_minutes
  FROM public.lessons l
  WHERE l.id = test_lesson_id
    AND l.lesson_type = 'test'
    AND EXISTS (
      SELECT 1
      FROM public.course_age_groups cag
      JOIN public.profiles p ON p.id = current_user_id
      WHERE cag.course_id = l.course_id
        AND cag.age_group = p.age_group
        AND p.role = 'student'
    );

  IF configured_minutes IS NULL THEN
    RAISE EXCEPTION 'test lesson not found or not available';
  END IF;

  INSERT INTO public.test_attempts (
    student_id,
    lesson_id,
    time_limit_minutes
  )
  VALUES (
    current_user_id,
    test_lesson_id,
    configured_minutes
  )
  ON CONFLICT (student_id, lesson_id) DO NOTHING;

  RETURN QUERY
  SELECT
    ta.id,
    ta.student_id,
    ta.lesson_id,
    ta.started_at,
    ta.time_limit_minutes,
    ta.submitted_at,
    ta.correct_count,
    ta.total_questions,
    ta.percentage,
    ta.elapsed_seconds
  FROM public.test_attempts ta
  WHERE ta.student_id = current_user_id
    AND ta.lesson_id = test_lesson_id;
END;
$$;

REVOKE ALL ON FUNCTION public.start_test_attempt(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_test_attempt(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_test_attempt(
  test_lesson_id uuid,
  test_answers jsonb
)
RETURNS TABLE (
  id uuid,
  student_id uuid,
  lesson_id uuid,
  started_at timestamptz,
  time_limit_minutes int,
  submitted_at timestamptz,
  correct_count int,
  total_questions int,
  percentage numeric,
  elapsed_seconds int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  attempt public.test_attempts%ROWTYPE;
  question jsonb;
  selected_indexes int[];
  correct_indexes int[];
  computed_correct int := 0;
  computed_total int := 0;
  elapsed int;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF public.is_admin() THEN
    RAISE EXCEPTION 'admin previews do not save test scores';
  END IF;
  IF jsonb_typeof(COALESCE(test_answers, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'answers must be a JSON object';
  END IF;

  -- Ensure the server-side start time exists even if the client missed its start call.
  INSERT INTO public.test_attempts (
    student_id,
    lesson_id,
    time_limit_minutes
  )
  SELECT
    current_user_id,
    l.id,
    CASE
      WHEN COALESCE(l.test_content->>'timeLimitMinutes', '') ~ '^[0-9]+$'
        THEN LEAST(GREATEST((l.test_content->>'timeLimitMinutes')::int, 1), 240)
      ELSE 30
    END
  FROM public.lessons l
  WHERE l.id = test_lesson_id
    AND l.lesson_type = 'test'
    AND EXISTS (
      SELECT 1
      FROM public.course_age_groups cag
      JOIN public.profiles p ON p.id = current_user_id
      WHERE cag.course_id = l.course_id
        AND cag.age_group = p.age_group
        AND p.role = 'student'
    )
  ON CONFLICT (student_id, lesson_id) DO NOTHING;

  SELECT ta.*
  INTO attempt
  FROM public.test_attempts ta
  WHERE ta.student_id = current_user_id
    AND ta.lesson_id = test_lesson_id
  FOR UPDATE;

  IF attempt.id IS NULL THEN
    RAISE EXCEPTION 'test attempt not available';
  END IF;

  -- The first submitted score is immutable.
  IF attempt.submitted_at IS NULL THEN
    FOR question IN
      SELECT q.value
      FROM public.lessons l
      CROSS JOIN LATERAL jsonb_array_elements(
        COALESCE(l.test_content->'questionSets', '[]'::jsonb)
      ) AS s(value)
      CROSS JOIN LATERAL jsonb_array_elements(
        COALESCE(s.value->'questions', '[]'::jsonb)
      ) AS q(value)
      WHERE l.id = test_lesson_id
      ORDER BY COALESCE((q.value->>'number')::int, 0)
    LOOP
      computed_total := computed_total + 1;

      SELECT COALESCE(
        array_agg(value::int ORDER BY value::int),
        ARRAY[]::int[]
      )
      INTO correct_indexes
      FROM jsonb_array_elements_text(
        COALESCE(question->'correctOptionIndexes', '[]'::jsonb)
      );

      SELECT COALESCE(
        array_agg(value::int ORDER BY value::int),
        ARRAY[]::int[]
      )
      INTO selected_indexes
      FROM jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(test_answers->(question->>'number')) = 'array'
            THEN test_answers->(question->>'number')
          ELSE '[]'::jsonb
        END
      );

      IF selected_indexes = correct_indexes THEN
        computed_correct := computed_correct + 1;
      END IF;
    END LOOP;

    IF computed_total < 1 THEN
      RAISE EXCEPTION 'test has no questions';
    END IF;

    elapsed := GREATEST(
      0,
      FLOOR(EXTRACT(EPOCH FROM (now() - attempt.started_at)))::int
    );

    UPDATE public.test_attempts ta
    SET
      submitted_at = now(),
      correct_count = computed_correct,
      total_questions = computed_total,
      percentage = ROUND((computed_correct::numeric * 100) / computed_total, 2),
      elapsed_seconds = elapsed
    WHERE ta.id = attempt.id;
  END IF;

  RETURN QUERY
  SELECT
    ta.id,
    ta.student_id,
    ta.lesson_id,
    ta.started_at,
    ta.time_limit_minutes,
    ta.submitted_at,
    ta.correct_count,
    ta.total_questions,
    ta.percentage,
    ta.elapsed_seconds
  FROM public.test_attempts ta
  WHERE ta.id = attempt.id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_test_attempt(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_test_attempt(uuid, jsonb) TO authenticated;
