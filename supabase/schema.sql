-- VA English Center — Supabase schema
-- Prefer: npx supabase db query --linked -f supabase/schema.sql
-- Or run this file in Supabase SQL Editor

CREATE TYPE public.age_group AS ENUM (
  'little_kids',
  'kids',
  'little_teens',
  'teens',
  'young_adults'
);

CREATE TYPE public.lesson_type AS ENUM ('content', 'video', 'game');

CREATE TYPE public.builtin_game AS ENUM ('flashcards', 'quiz', 'match');

CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_image_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_age_groups (
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  age_group public.age_group NOT NULL,
  PRIMARY KEY (course_id, age_group)
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  image_url text,
  video_url text,
  order_index int NOT NULL DEFAULT 0,
  lesson_type public.lesson_type NOT NULL DEFAULT 'content',
  embed_url text,
  game_cards jsonb NOT NULL DEFAULT '[]'::jsonb,
  builtin_game public.builtin_game,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age_group public.age_group NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_age_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Students can read courses" ON public.courses;
DROP POLICY IF EXISTS "Students can read courses for their age group" ON public.courses;
DROP POLICY IF EXISTS "Students and admins can read courses" ON public.courses;
CREATE POLICY "Students and admins can read courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.course_age_groups cag
      INNER JOIN public.profiles p ON p.id = auth.uid()
      WHERE cag.course_id = courses.id
        AND cag.age_group = p.age_group
    )
  );

DROP POLICY IF EXISTS "Students and admins can read course age groups" ON public.course_age_groups;
CREATE POLICY "Students and admins can read course age groups"
  ON public.course_age_groups FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR age_group = (
      SELECT p.age_group FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can read lessons" ON public.lessons;
DROP POLICY IF EXISTS "Students can read lessons for their age group" ON public.lessons;
DROP POLICY IF EXISTS "Students and admins can read lessons" ON public.lessons;
CREATE POLICY "Students and admins can read lessons"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.courses c
      INNER JOIN public.course_age_groups cag ON cag.course_id = c.id
      INNER JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.id = lessons.course_id
        AND cag.age_group = p.age_group
    )
  );

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_age_group public.age_group;
BEGIN
  selected_age_group := COALESCE(
    (NEW.raw_user_meta_data->>'age_group')::public.age_group,
    'teens'::public.age_group
  );

  INSERT INTO public.profiles (id, age_group)
  VALUES (NEW.id, selected_age_group);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.courses (title, description)
SELECT 'Kids English', 'Playful lessons for young learners — songs, games, and stories.'
WHERE NOT EXISTS (SELECT 1 FROM public.courses WHERE title = 'Kids English');

INSERT INTO public.course_age_groups (course_id, age_group)
SELECT c.id, 'kids'
FROM public.courses c
WHERE c.title = 'Kids English'
AND NOT EXISTS (
  SELECT 1 FROM public.course_age_groups cag
  WHERE cag.course_id = c.id AND cag.age_group = 'kids'
);

INSERT INTO public.courses (title, description)
SELECT 'Teen Exam Prep', 'IELTS and school English with structured practice.'
WHERE NOT EXISTS (SELECT 1 FROM public.courses WHERE title = 'Teen Exam Prep');

INSERT INTO public.course_age_groups (course_id, age_group)
SELECT c.id, 'teens'
FROM public.courses c
WHERE c.title = 'Teen Exam Prep'
AND NOT EXISTS (
  SELECT 1 FROM public.course_age_groups cag
  WHERE cag.course_id = c.id AND cag.age_group = 'teens'
);

INSERT INTO public.lessons (course_id, title, content, order_index)
SELECT id, 'Welcome!', 'Welcome to VA English Center. Start with this intro lesson.', 1
FROM public.courses WHERE title = 'Kids English'
AND NOT EXISTS (
  SELECT 1 FROM public.lessons l
  JOIN public.courses c ON c.id = l.course_id
  WHERE c.title = 'Kids English' AND l.title = 'Welcome!'
)
LIMIT 1;

INSERT INTO public.lessons (course_id, title, content, order_index)
SELECT id, 'Alphabet & Sounds', 'Practice A–Z with fun examples and repetition.', 2
FROM public.courses WHERE title = 'Kids English'
AND NOT EXISTS (
  SELECT 1 FROM public.lessons l
  JOIN public.courses c ON c.id = l.course_id
  WHERE c.title = 'Kids English' AND l.title = 'Alphabet & Sounds'
)
LIMIT 1;
