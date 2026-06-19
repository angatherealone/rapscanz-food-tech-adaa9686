
-- 1. Restrict profile column updates: revoke privileged columns from authenticated
REVOKE UPDATE (is_subscribed, scan_count, subscription_expires_at, plan, plan_expires_at, email, created_at, id)
  ON public.profiles FROM authenticated;

-- Re-grant only the safe, user-editable columns
GRANT UPDATE (username, weight_kg, height_cm, illnesses, allergies, gender)
  ON public.profiles TO authenticated;

-- 2. Add UPDATE policy on consumption (defense in depth)
DROP POLICY IF EXISTS "Users update own consumption" ON public.consumption;
CREATE POLICY "Users update own consumption" ON public.consumption
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Lock down SECURITY DEFINER function execution
-- consume_scan_quota: only authenticated callers (already parameter-less in current schema)
REVOKE ALL ON FUNCTION public.consume_scan_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_scan_quota() TO authenticated;

-- Drop any legacy overload that took a caller-controlled limit
DROP FUNCTION IF EXISTS public.consume_scan_quota(int);
DROP FUNCTION IF EXISTS public.consume_scan_quota(integer);

-- get_leaderboard: only service_role; we'll proxy through a server function
REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO service_role;

-- handle_new_user is a trigger function; revoke direct API execution
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
