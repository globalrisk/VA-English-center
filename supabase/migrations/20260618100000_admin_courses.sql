-- Admin course management: create courses and map age groups

CREATE OR REPLACE FUNCTION public.admin_create_course(
  course_title text,
  course_description text,
  course_age_group public.age_group
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

  INSERT INTO public.courses (title, description, age_group)
  VALUES (course_title, course_description, course_age_group)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_course(text, text, public.age_group) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_course(text, text, public.age_group) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_course_age_group(
  course_id uuid,
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

  UPDATE public.courses
  SET age_group = new_age_group
  WHERE id = course_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_course_age_group(uuid, public.age_group) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_course_age_group(uuid, public.age_group) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_course(
  course_id uuid,
  course_title text,
  course_description text,
  course_age_group public.age_group
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

  UPDATE public.courses
  SET
    title = course_title,
    description = course_description,
    age_group = course_age_group
  WHERE id = course_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_course(uuid, text, text, public.age_group) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_course(uuid, text, text, public.age_group) TO authenticated;
