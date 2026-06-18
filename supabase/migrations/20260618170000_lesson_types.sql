-- Lesson types: reading, video, and game (flashcards / Quizlet)

CREATE TYPE public.lesson_type AS ENUM ('content', 'video', 'game');

ALTER TABLE public.lessons
  ADD COLUMN lesson_type public.lesson_type NOT NULL DEFAULT 'content',
  ADD COLUMN embed_url text,
  ADD COLUMN game_cards jsonb NOT NULL DEFAULT '[]'::jsonb;

DROP FUNCTION IF EXISTS public.admin_create_lesson(uuid, text, text, text, text, int);
DROP FUNCTION IF EXISTS public.admin_update_lesson(uuid, text, text, text, text, int);

CREATE OR REPLACE FUNCTION public.admin_create_lesson(
  p_course_id uuid,
  lesson_title text,
  lesson_content text,
  lesson_image_url text,
  lesson_video_url text,
  lesson_order_index int,
  lesson_type public.lesson_type,
  lesson_embed_url text,
  lesson_game_cards jsonb
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
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id) THEN
    RAISE EXCEPTION 'course not found';
  END IF;

  resolved_cards := COALESCE(lesson_game_cards, '[]'::jsonb);

  IF lesson_type = 'video' AND (lesson_video_url IS NULL OR trim(lesson_video_url) = '') THEN
    RAISE EXCEPTION 'video lessons require a video URL';
  END IF;

  IF lesson_type = 'game' THEN
    IF lesson_embed_url IS NULL OR trim(lesson_embed_url) = '' THEN
      IF jsonb_array_length(resolved_cards) < 2 THEN
        RAISE EXCEPTION 'game lessons need a Quizlet embed URL or at least 2 flashcards';
      END IF;
    END IF;
  END IF;

  IF lesson_order_index IS NULL THEN
    SELECT COALESCE(MAX(l.order_index), 0) + 1
    INTO resolved_order
    FROM public.lessons l
    WHERE l.course_id = p_course_id;
  ELSE
    resolved_order := lesson_order_index;
  END IF;

  INSERT INTO public.lessons (
    course_id,
    title,
    content,
    image_url,
    video_url,
    order_index,
    lesson_type,
    embed_url,
    game_cards
  )
  VALUES (
    p_course_id,
    lesson_title,
    lesson_content,
    lesson_image_url,
    lesson_video_url,
    resolved_order,
    lesson_type,
    lesson_embed_url,
    resolved_cards
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_lesson(uuid, text, text, text, text, int, public.lesson_type, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_lesson(uuid, text, text, text, text, int, public.lesson_type, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_lesson(
  lesson_id uuid,
  lesson_title text,
  lesson_content text,
  lesson_image_url text,
  lesson_video_url text,
  lesson_order_index int,
  lesson_type public.lesson_type,
  lesson_embed_url text,
  lesson_game_cards jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_cards jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  resolved_cards := COALESCE(lesson_game_cards, '[]'::jsonb);

  IF lesson_type = 'video' AND (lesson_video_url IS NULL OR trim(lesson_video_url) = '') THEN
    RAISE EXCEPTION 'video lessons require a video URL';
  END IF;

  IF lesson_type = 'game' THEN
    IF lesson_embed_url IS NULL OR trim(lesson_embed_url) = '' THEN
      IF jsonb_array_length(resolved_cards) < 2 THEN
        RAISE EXCEPTION 'game lessons need a Quizlet embed URL or at least 2 flashcards';
      END IF;
    END IF;
  END IF;

  UPDATE public.lessons
  SET
    title = lesson_title,
    content = lesson_content,
    image_url = lesson_image_url,
    video_url = lesson_video_url,
    order_index = lesson_order_index,
    lesson_type = admin_update_lesson.lesson_type,
    embed_url = lesson_embed_url,
    game_cards = resolved_cards
  WHERE id = lesson_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_lesson(uuid, text, text, text, text, int, public.lesson_type, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_lesson(uuid, text, text, text, text, int, public.lesson_type, text, jsonb) TO authenticated;
