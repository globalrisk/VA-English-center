-- Course units (Vocabulary / Reading / Listening) + lesson types game|test

CREATE TYPE public.unit_kind AS ENUM ('vocabulary', 'reading', 'listening');

CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  kind public.unit_kind NOT NULL,
  order_index int NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (course_id, kind)
);

CREATE INDEX units_course_id_idx ON public.units (course_id);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students and admins can read units"
  ON public.units FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.courses c
      INNER JOIN public.course_age_groups cag ON cag.course_id = c.id
      INNER JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.id = units.course_id
        AND cag.age_group = p.age_group
    )
  );

-- Backfill fixed units for every course
INSERT INTO public.units (course_id, kind, order_index)
SELECT c.id, k.kind, k.order_index
FROM public.courses c
CROSS JOIN (
  VALUES
    ('vocabulary'::public.unit_kind, 1),
    ('reading'::public.unit_kind, 2),
    ('listening'::public.unit_kind, 3)
) AS k(kind, order_index);

ALTER TABLE public.lessons
  ADD COLUMN unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE;

-- Map old lesson types into units
UPDATE public.lessons l
SET unit_id = u.id
FROM public.units u
WHERE u.course_id = l.course_id
  AND u.kind = CASE l.lesson_type::text
    WHEN 'game' THEN 'vocabulary'::public.unit_kind
    WHEN 'content' THEN 'reading'::public.unit_kind
    WHEN 'video' THEN 'listening'::public.unit_kind
    ELSE 'vocabulary'::public.unit_kind
  END;

-- Any leftover lessons without a match go to Vocabulary
UPDATE public.lessons l
SET unit_id = u.id
FROM public.units u
WHERE l.unit_id IS NULL
  AND u.course_id = l.course_id
  AND u.kind = 'vocabulary';

ALTER TABLE public.lessons
  ALTER COLUMN unit_id SET NOT NULL;

CREATE INDEX lessons_unit_id_idx ON public.lessons (unit_id);

-- Drop RPCs that depend on the old lesson_type enum
DROP FUNCTION IF EXISTS public.admin_create_lesson(uuid, text, text, text, text, int, public.lesson_type, text, jsonb, public.builtin_game);
DROP FUNCTION IF EXISTS public.admin_update_lesson(uuid, text, text, text, text, int, public.lesson_type, text, jsonb, public.builtin_game);

-- Replace lesson_type enum with game | test
ALTER TABLE public.lessons ALTER COLUMN lesson_type DROP DEFAULT;

ALTER TABLE public.lessons
  ALTER COLUMN lesson_type TYPE text
  USING (
    CASE lesson_type::text
      WHEN 'game' THEN 'game'
      ELSE 'test'
    END
  );

DROP TYPE public.lesson_type;

CREATE TYPE public.lesson_type AS ENUM ('game', 'test');

ALTER TABLE public.lessons
  ALTER COLUMN lesson_type TYPE public.lesson_type
  USING lesson_type::public.lesson_type;

ALTER TABLE public.lessons
  ALTER COLUMN lesson_type SET DEFAULT 'game'::public.lesson_type;

-- Create course: also seed the 3 units
CREATE OR REPLACE FUNCTION public.admin_create_course(
  course_title text,
  course_description text,
  course_age_groups public.age_group[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF course_age_groups IS NULL OR cardinality(course_age_groups) < 1 THEN
    RAISE EXCEPTION 'at least one age group required';
  END IF;

  INSERT INTO public.courses (title, description)
  VALUES (course_title, course_description)
  RETURNING id INTO new_id;

  INSERT INTO public.course_age_groups (course_id, age_group)
  SELECT new_id, unnest(course_age_groups);

  INSERT INTO public.units (course_id, kind, order_index)
  VALUES
    (new_id, 'vocabulary', 1),
    (new_id, 'reading', 2),
    (new_id, 'listening', 3);

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_course(text, text, public.age_group[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_course(text, text, public.age_group[]) TO authenticated;

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
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id) THEN
    RAISE EXCEPTION 'course not found';
  END IF;

  SELECT course_id INTO unit_course FROM public.units WHERE id = lesson_unit_id;
  IF unit_course IS NULL THEN
    RAISE EXCEPTION 'unit not found';
  END IF;
  IF unit_course <> p_course_id THEN
    RAISE EXCEPTION 'unit does not belong to this course';
  END IF;

  resolved_cards := COALESCE(lesson_game_cards, '[]'::jsonb);

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
    lesson_embed_url,
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

  SELECT course_id INTO unit_course FROM public.units WHERE id = lesson_unit_id;
  IF unit_course IS NULL THEN
    RAISE EXCEPTION 'unit not found';
  END IF;
  IF unit_course <> lesson_course THEN
    RAISE EXCEPTION 'unit does not belong to this course';
  END IF;

  resolved_cards := COALESCE(lesson_game_cards, '[]'::jsonb);

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
    unit_id = lesson_unit_id,
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

REVOKE ALL ON FUNCTION public.admin_update_lesson(uuid, uuid, text, text, text, text, int, public.lesson_type, text, jsonb, public.builtin_game) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_lesson(uuid, uuid, text, text, text, text, int, public.lesson_type, text, jsonb, public.builtin_game) TO authenticated;
