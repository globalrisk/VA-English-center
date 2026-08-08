-- Restrict timed-attempt RPCs to signed-in users and optimize the attempt policy.

REVOKE EXECUTE ON FUNCTION public.start_test_attempt(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_test_attempt(uuid, jsonb) FROM anon;

DROP POLICY IF EXISTS "Students read own test attempts" ON public.test_attempts;
CREATE POLICY "Students read own test attempts"
  ON public.test_attempts FOR SELECT
  TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  );
