-- Fix builtin_game parameter binding on lesson update

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
    builtin_game = admin_update_lesson.lesson_builtin_game
  WHERE id = admin_update_lesson.lesson_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_lesson(uuid, text, text, text, text, int, public.lesson_type, text, jsonb, public.builtin_game) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_lesson(uuid, text, text, text, text, int, public.lesson_type, text, jsonb, public.builtin_game) TO authenticated;
