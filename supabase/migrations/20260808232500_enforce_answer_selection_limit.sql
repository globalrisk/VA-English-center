-- Prevent forged oversized selections from earning answer-level points.

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
  matched_points int;
  computed_correct int := 0;
  computed_total int := 0;
  elapsed int;
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF public.is_admin() THEN RAISE EXCEPTION 'admin previews do not save test scores'; END IF;
  IF jsonb_typeof(COALESCE(test_answers, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'answers must be a JSON object';
  END IF;

  INSERT INTO public.test_attempts (student_id, lesson_id, time_limit_minutes)
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

  IF attempt.id IS NULL THEN RAISE EXCEPTION 'test attempt not available'; END IF;

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
      SELECT COALESCE(
        array_agg(value::int ORDER BY value::int),
        ARRAY[]::int[]
      )
      INTO correct_indexes
      FROM jsonb_array_elements_text(
        COALESCE(question->'correctOptionIndexes', '[]'::jsonb)
      );

      SELECT COALESCE(
        array_agg(DISTINCT value::int ORDER BY value::int),
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

      computed_total := computed_total + cardinality(correct_indexes);

      IF cardinality(selected_indexes) <= cardinality(correct_indexes) THEN
        SELECT COUNT(*)::int
        INTO matched_points
        FROM unnest(correct_indexes) AS correct_index
        WHERE correct_index = ANY(selected_indexes);
      ELSE
        matched_points := 0;
      END IF;

      computed_correct := computed_correct + matched_points;
    END LOOP;

    IF computed_total < 1 THEN RAISE EXCEPTION 'test has no correct answers'; END IF;

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
REVOKE EXECUTE ON FUNCTION public.submit_test_attempt(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_test_attempt(uuid, jsonb) TO authenticated;
