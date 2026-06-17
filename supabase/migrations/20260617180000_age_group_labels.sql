-- Expand age groups: kids, little_teens, teens, young_adults

DROP POLICY IF EXISTS "Students and admins can read courses" ON public.courses;
DROP POLICY IF EXISTS "Students can read courses for their age group" ON public.courses;
DROP POLICY IF EXISTS "Students and admins can read lessons" ON public.lessons;
DROP POLICY IF EXISTS "Students can read lessons for their age group" ON public.lessons;

DROP FUNCTION IF EXISTS public.admin_update_student_age_group(uuid, public.age_group);
DROP FUNCTION IF EXISTS public.admin_list_students();

CREATE TYPE public.age_group_v2 AS ENUM (
  'kids',
  'little_teens',
  'teens',
  'young_adults'
);

ALTER TABLE public.courses
  ALTER COLUMN age_group TYPE public.age_group_v2
  USING (
    CASE age_group::text
      WHEN 'kids' THEN 'kids'::public.age_group_v2
      WHEN 'teen' THEN 'teens'::public.age_group_v2
      WHEN 'adult' THEN 'young_adults'::public.age_group_v2
      ELSE 'kids'::public.age_group_v2
    END
  );

ALTER TABLE public.profiles
  ALTER COLUMN age_group TYPE public.age_group_v2
  USING (
    CASE age_group::text
      WHEN 'kids' THEN 'kids'::public.age_group_v2
      WHEN 'teen' THEN 'teens'::public.age_group_v2
      WHEN 'adult' THEN 'young_adults'::public.age_group_v2
      ELSE 'teens'::public.age_group_v2
    END
  );

DROP TYPE public.age_group;
ALTER TYPE public.age_group_v2 RENAME TO age_group;

UPDATE public.courses SET age_group = 'kids' WHERE title = 'Kids English';
UPDATE public.courses SET age_group = 'teens' WHERE title = 'Teen Exam Prep';

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

CREATE POLICY "Students and admins can read courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR age_group = (
      SELECT p.age_group FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Students and admins can read lessons"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.courses c
      INNER JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.id = lessons.course_id
        AND c.age_group = p.age_group
    )
  );

CREATE OR REPLACE FUNCTION public.admin_list_students()
RETURNS TABLE (
  id uuid,
  email text,
  age_group public.age_group,
  role public.user_role,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT p.id, u.email::text, p.age_group, p.role, p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY u.email;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_students() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_students() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_student_age_group(
  student_id uuid,
  new_age_group public.age_group
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.profiles
  SET age_group = new_age_group
  WHERE id = student_id AND role = 'student';
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_student_age_group(uuid, public.age_group) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_student_age_group(uuid, public.age_group) TO authenticated;
