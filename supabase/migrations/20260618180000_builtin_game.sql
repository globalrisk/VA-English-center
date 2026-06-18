-- Built-in game selection per lesson (flashcards, quiz, match)

CREATE TYPE public.builtin_game AS ENUM ('flashcards', 'quiz', 'match');

ALTER TABLE public.lessons
  ADD COLUMN builtin_game public.builtin_game;

UPDATE public.lessons
SET builtin_game = 'flashcards'
WHERE lesson_type = 'game'
  AND (embed_url IS NULL OR trim(embed_url) = '')
  AND jsonb_array_length(game_cards) >= 2;

DROP FUNCTION IF EXISTS public.admin_create_lesson(uuid, text, text, text, text, int, public.lesson_type, text, jsonb);
DROP FUNCTION IF EXISTS public.admin_update_lesson(uuid, text, text, text, text, int, public.lesson_type, text, jsonb);

CREATE OR REPLACE FUNCTION public.admin_create_lesson(
  p_course_id uuid,
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
    IF lesson_embed_url IS NOT NULL AND trim(lesson_embed_url) <> '' THEN
      IF lesson_builtin_game IS NOT NULL THEN
        RAISE EXCEPTION 'use Quizlet embed or a built-in game, not both';
      END IF;
    ELSE
      IF lesson_builtin_game IS NULL THEN
        RAISE EXCEPTION 'choose a built-in game or provide a Quizlet embed URL';
      END IF;
      IF jsonb_array_length(resolved_cards) < 2 THEN
        RAISE EXCEPTION 'built-in games need at least 2 flashcards';
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
    game_cards,
    builtin_game
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
    resolved_cards,
    lesson_builtin_game
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_lesson(uuid, text, text, text, text, int, public.lesson_type, text, jsonb, public.builtin_game) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_lesson(uuid, text, text, text, text, int, public.lesson_type, text, jsonb, public.builtin_game) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_lesson(
  lesson_id uuid,
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
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  resolved_cards := COALESCE(lesson_game_cards, '[]'::jsonb);

  IF lesson_type = 'video' AND (lesson_video_url IS NULL OR trim(lesson_video_url) = '') THEN
    RAISE EXCEPTION 'video lessons require a video URL';
  END IF;

  IF lesson_type = 'game' THEN
    IF lesson_embed_url IS NOT NULL AND trim(lesson_embed_url) <> '' THEN
      IF lesson_builtin_game IS NOT NULL THEN
        RAISE EXCEPTION 'use Quizlet embed or a built-in game, not both';
      END IF;
    ELSE
      IF lesson_builtin_game IS NULL THEN
        RAISE EXCEPTION 'choose a built-in game or provide a Quizlet embed URL';
      END IF;
      IF jsonb_array_length(resolved_cards) < 2 THEN
        RAISE EXCEPTION 'built-in games need at least 2 flashcards';
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
    game_cards = resolved_cards,
    builtin_game = lesson_builtin_game
  WHERE id = lesson_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_lesson(uuid, text, text, text, text, int, public.lesson_type, text, jsonb, public.builtin_game) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_lesson(uuid, text, text, text, text, int, public.lesson_type, text, jsonb, public.builtin_game) TO authenticated;
