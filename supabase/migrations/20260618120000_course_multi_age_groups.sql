-- Allow courses to map to multiple age groups

CREATE TABLE public.course_age_groups (
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  age_group public.age_group NOT NULL,
  PRIMARY KEY (course_id, age_group)
);

INSERT INTO public.course_age_groups (course_id, age_group)
SELECT id, age_group FROM public.courses;

DROP POLICY IF EXISTS "Students and admins can read courses" ON public.courses;
DROP POLICY IF EXISTS "Students and admins can read lessons" ON public.lessons;

ALTER TABLE public.courses DROP COLUMN age_group;

ALTER TABLE public.course_age_groups ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Students and admins can read course age groups"
  ON public.course_age_groups FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR age_group = (
      SELECT p.age_group FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

DROP FUNCTION IF EXISTS public.admin_create_course(text, text, public.age_group);
DROP FUNCTION IF EXISTS public.admin_update_course_age_group(uuid, public.age_group);
DROP FUNCTION IF EXISTS public.admin_update_course(uuid, text, text, public.age_group);

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

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_course(text, text, public.age_group[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_course(text, text, public.age_group[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_course_age_groups(
  course_id uuid,
  new_age_groups public.age_group[]
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

  IF new_age_groups IS NULL OR cardinality(new_age_groups) < 1 THEN
    RAISE EXCEPTION 'at least one age group required';
  END IF;

  DELETE FROM public.course_age_groups WHERE course_age_groups.course_id = admin_update_course_age_groups.course_id;

  INSERT INTO public.course_age_groups (course_id, age_group)
  SELECT admin_update_course_age_groups.course_id, unnest(new_age_groups);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_course_age_groups(uuid, public.age_group[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_course_age_groups(uuid, public.age_group[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_course(
  course_id uuid,
  course_title text,
  course_description text,
  course_age_groups public.age_group[]
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

  IF course_age_groups IS NULL OR cardinality(course_age_groups) < 1 THEN
    RAISE EXCEPTION 'at least one age group required';
  END IF;

  UPDATE public.courses
  SET
    title = course_title,
    description = course_description
  WHERE id = course_id;

  DELETE FROM public.course_age_groups WHERE course_age_groups.course_id = admin_update_course.course_id;

  INSERT INTO public.course_age_groups (course_id, age_group)
  SELECT admin_update_course.course_id, unnest(course_age_groups);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_course(uuid, text, text, public.age_group[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_course(uuid, text, text, public.age_group[]) TO authenticated;
