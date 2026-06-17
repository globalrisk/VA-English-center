-- Age groups for students and course access control

CREATE TYPE public.age_group AS ENUM ('kids', 'teen', 'adult');

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS age_group public.age_group;

UPDATE public.courses SET age_group = 'kids' WHERE title = 'Kids English' AND age_group IS NULL;
UPDATE public.courses SET age_group = 'teen' WHERE title = 'Teen Exam Prep' AND age_group IS NULL;

ALTER TABLE public.courses
  ALTER COLUMN age_group SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age_group public.age_group NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Backfill profiles for existing users (default teen if no metadata)
INSERT INTO public.profiles (id, age_group)
SELECT
  u.id,
  COALESCE(
    (u.raw_user_meta_data->>'age_group')::public.age_group,
    'teen'::public.age_group
  )
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM public.profiles);

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
    'teen'::public.age_group
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

DROP POLICY IF EXISTS "Students can read courses" ON public.courses;
DROP POLICY IF EXISTS "Students can read lessons" ON public.lessons;

CREATE POLICY "Students can read courses for their age group"
  ON public.courses FOR SELECT
  TO authenticated
  USING (
    age_group = (
      SELECT p.age_group FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Students can read lessons for their age group"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses c
      INNER JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.id = lessons.course_id
        AND c.age_group = p.age_group
    )
  );
