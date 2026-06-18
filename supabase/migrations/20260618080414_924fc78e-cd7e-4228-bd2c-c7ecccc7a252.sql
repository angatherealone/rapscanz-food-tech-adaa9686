-- Revoke ability for users to update sensitive billing columns on their profile.
-- Only service_role (server-side, after verified payment) can modify these.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (email) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;