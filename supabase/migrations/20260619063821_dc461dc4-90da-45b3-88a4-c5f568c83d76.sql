
DROP POLICY IF EXISTS "Users insert own consumption" ON public.consumption;
DROP POLICY IF EXISTS "Users delete own consumption" ON public.consumption;

CREATE POLICY "Users insert own consumption"
  ON public.consumption FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own consumption"
  ON public.consumption FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.scans IS
  'Scan history is append-only by design. No UPDATE policy exists, so updates are denied to all roles. Do not add an UPDATE policy unless the product explicitly supports editing past scans; if added, it MUST enforce auth.uid() = user_id in both USING and WITH CHECK and be scoped to the authenticated role.';
