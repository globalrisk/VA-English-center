-- Admin: delete courses (lessons and age groups cascade)

CREATE OR REPLACE FUNCTION public.admin_delete_course(course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  DELETE FROM public.courses WHERE id = course_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_course(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_course(uuid) TO authenticated;
