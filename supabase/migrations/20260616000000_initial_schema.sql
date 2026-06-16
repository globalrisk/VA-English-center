-- VA English Center — initial schema

CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_image_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  image_url text,
  video_url text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can read courses" ON public.courses;
DROP POLICY IF EXISTS "Students can read lessons" ON public.lessons;

CREATE POLICY "Students can read courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Students can read lessons"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (true);

-- Sample data (only if empty)
INSERT INTO public.courses (title, description)
SELECT 'Kids English', 'Playful lessons for young learners — songs, games, and stories.'
WHERE NOT EXISTS (SELECT 1 FROM public.courses WHERE title = 'Kids English');

INSERT INTO public.courses (title, description)
SELECT 'Teen Exam Prep', 'IELTS and school English with structured practice.'
WHERE NOT EXISTS (SELECT 1 FROM public.courses WHERE title = 'Teen Exam Prep');

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
