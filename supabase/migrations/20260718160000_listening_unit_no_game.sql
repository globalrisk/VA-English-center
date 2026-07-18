-- Listening unit: Test lessons only (no Game type).

UPDATE public.lessons l
SET
  lesson_type = 'test',
  builtin_game = NULL,
  game_cards = '[]'::jsonb,
  embed_url = NULL
FROM public.units u
WHERE l.unit_id = u.id
  AND u.kind = 'listening'
  AND l.lesson_type = 'game';

CREATE OR REPLACE FUNCTION public.admin_create_lesson(
  p_course_id uuid,
  lesson_unit_id uuid,
  lesson_title text,
  lesson_content text,
  lesson_image_url text,
  lesson_video_url text,
  lesson_order_index int,
  lesson_type public.lesson_type,
  lesson_embed_url text,
  lesson_game_cards jsonb,
  lesson_builtin_game public.builtin_game
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  resolved_order int;
  resolved_cards jsonb;
  unit_course uuid;
  unit_kind public.unit_kind;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id) THEN
    RAISE EXCEPTION 'course not found';
  END IF;

  SELECT course_id, kind INTO unit_course, unit_kind
  FROM public.units
  WHERE id = lesson_unit_id;

  IF unit_course IS NULL THEN
    RAISE EXCEPTION 'unit not found';
  END IF;
  IF unit_course <> p_course_id THEN
    RAISE EXCEPTION 'unit does not belong to this course';
  END IF;

  IF unit_kind = 'listening' AND lesson_type = 'game' THEN
    RAISE EXCEPTION 'game lessons are not allowed in the Listening unit';
  END IF;

  resolved_cards := COALESCE(lesson_game_cards, '[]'::jsonb);

  IF lesson_type = 'game' THEN
    IF lesson_embed_url IS NOT NULL AND trim(lesson_embed_url) <> '' THEN
      RAISE EXCEPTION 'Quizlet embed is no longer supported';
    END IF;
    IF lesson_builtin_game IS NULL THEN
      RAISE EXCEPTION 'choose a built-in game';
    END IF;
    IF jsonb_array_length(resolved_cards) < 2 THEN
      RAISE EXCEPTION 'built-in games need at least 2 flashcards';
    END IF;
  END IF;

  IF lesson_order_index IS NULL THEN
    SELECT COALESCE(MAX(l.order_index), 0) + 1
    INTO resolved_order
    FROM public.lessons l
    WHERE l.unit_id = lesson_unit_id;
  ELSE
    resolved_order := lesson_order_index;
  END IF;

  INSERT INTO public.lessons (
    course_id,
    unit_id,
    title,
    content,
    image_url,
    video_url,
    order_index,
    lesson_type,
    embed_url,
    game_cards,
    builtin_game
  )
  VALUES (
    p_course_id,
    lesson_unit_id,
    lesson_title,
    lesson_content,
    lesson_image_url,
    lesson_video_url,
    resolved_order,
    lesson_type,
    NULL,
    resolved_cards,
    lesson_builtin_game
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_lesson(uuid, uuid, text, text, text, text, int, public.lesson_type, text, jsonb, public.builtin_game) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_lesson(uuid, uuid, text, text, text, text, int, public.lesson_type, text, jsonb, public.builtin_game) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_lesson(
  lesson_id uuid,
  lesson_unit_id uuid,
  lesson_title text,
  lesson_content text,
  lesson_image_url text,
  lesson_video_url text,
  lesson_order_index int,
  lesson_type public.lesson_type,
  lesson_embed_url text,
  lesson_game_cards jsonb,
  lesson_builtin_game public.builtin_game
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_cards jsonb;
  lesson_course uuid;
  unit_course uuid;
  unit_kind public.unit_kind;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT course_id INTO lesson_course
  FROM public.lessons
  WHERE id = admin_update_lesson.lesson_id;

  IF lesson_course IS NULL THEN
    RAISE EXCEPTION 'lesson not found';
  END IF;

  SELECT course_id, kind INTO unit_course, unit_kind
  FROM public.units
  WHERE id = lesson_unit_id;

  IF unit_course IS NULL THEN
    RAISE EXCEPTION 'unit not found';
  END IF;
  IF unit_course <> lesson_course THEN
    RAISE EXCEPTION 'unit does not belong to this course';
  END IF;

  IF unit_kind = 'listening' AND lesson_type = 'game' THEN
    RAISE EXCEPTION 'game lessons are not allowed in the Listening unit';
  END IF;

  resolved_cards := COALESCE(lesson_game_cards, '[]'::jsonb);

  IF lesson_type = 'game' THEN
    IF lesson_embed_url IS NOT NULL AND trim(lesson_embed_url) <> '' THEN
      RAISE EXCEPTION 'Quizlet embed is no longer supported';
    END IF;
    IF lesson_builtin_game IS NULL THEN
      RAISE EXCEPTION 'choose a built-in game';
    END IF;
    IF jsonb_array_length(resolved_cards) < 2 THEN
      RAISE EXCEPTION 'built-in games need at least 2 flashcards';
    END IF;
  END IF;

  UPDATE public.lessons
  SET
    unit_id = lesson_unit_id,
    title = lesson_title,
    content = lesson_content,
    image_url = lesson_image_url,
    video_url = lesson_video_url,
    order_index = lesson_order_index,
    lesson_type = admin_update_lesson.lesson_type,
    embed_url = NULL,
    game_cards = resolved_cards,
    builtin_game = admin_update_lesson.lesson_builtin_game
  WHERE id = admin_update_lesson.lesson_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_lesson(uuid, uuid, text, text, text, text, int, public.lesson_type, text, jsonb, public.builtin_game) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_lesson(uuid, uuid, text, text, text, text, int, public.lesson_type, text, jsonb, public.builtin_game) TO authenticated;
