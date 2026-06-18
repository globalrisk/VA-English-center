-- Admin lesson management: create, update, delete

CREATE OR REPLACE FUNCTION public.admin_create_lesson(
  p_course_id uuid,
  lesson_title text,
  lesson_content text,
  lesson_image_url text,
  lesson_video_url text,
  lesson_order_index int
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  resolved_order int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id) THEN
    RAISE EXCEPTION 'course not found';
  END IF;

  IF lesson_order_index IS NULL THEN
    SELECT COALESCE(MAX(l.order_index), 0) + 1
    INTO resolved_order
    FROM public.lessons l
    WHERE l.course_id = p_course_id;
  ELSE
    resolved_order := lesson_order_index;
  END IF;

  INSERT INTO public.lessons (
    course_id,
    title,
    content,
    image_url,
    video_url,
    order_index
  )
  VALUES (
    p_course_id,
    lesson_title,
    lesson_content,
    lesson_image_url,
    lesson_video_url,
    resolved_order
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_lesson(uuid, text, text, text, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_lesson(uuid, text, text, text, text, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_lesson(
  lesson_id uuid,
  lesson_title text,
  lesson_content text,
  lesson_image_url text,
  lesson_video_url text,
  lesson_order_index int
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

  UPDATE public.lessons
  SET
    title = lesson_title,
    content = lesson_content,
    image_url = lesson_image_url,
    video_url = lesson_video_url,
    order_index = lesson_order_index
  WHERE id = lesson_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_lesson(uuid, text, text, text, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_lesson(uuid, text, text, text, text, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_lesson(lesson_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  DELETE FROM public.lessons WHERE id = lesson_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_lesson(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_lesson(uuid) TO authenticated;
