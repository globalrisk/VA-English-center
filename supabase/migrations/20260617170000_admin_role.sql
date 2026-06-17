-- Admin role and student age-group management

CREATE TYPE public.user_role AS ENUM ('student', 'admin');

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'student';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Promote existing owner account
UPDATE public.profiles p
SET role = 'admin'
FROM auth.users u
WHERE p.id = u.id AND u.email = 'globalrisk07@gmail.com';

DROP POLICY IF EXISTS "Students can read courses for their age group" ON public.courses;
CREATE POLICY "Students and admins can read courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR age_group = (
      SELECT p.age_group FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can read lessons for their age group" ON public.lessons;
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
