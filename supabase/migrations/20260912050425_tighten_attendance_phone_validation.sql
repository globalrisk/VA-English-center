ALTER TABLE public.attendance_students
  DROP CONSTRAINT attendance_students_parent_phone_check;

ALTER TABLE public.attendance_students
  ADD CONSTRAINT attendance_students_parent_phone_check CHECK (
    regexp_replace(parent_phone, '[[:space:]().-]', '', 'g')
      ~ '^(0[0-9]{9}|\+?84[0-9]{9})$'
  );
