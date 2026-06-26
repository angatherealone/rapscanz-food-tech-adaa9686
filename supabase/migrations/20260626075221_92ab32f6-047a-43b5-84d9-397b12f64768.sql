
-- Restore Data API grants on profiles (were missing, breaking profile updates)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Add WITH CHECK to update policy so updated rows still belong to the user
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Leaderboard: show every user with at least one scored scan, ranked highest first
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE(username text, avg_score numeric, scan_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(p.username, ''), 'Anonymous #' || substr(p.id::text, 1, 6)) AS username,
         ROUND(AVG(s.health_score)::numeric, 1) AS avg_score,
         COUNT(s.id) AS scan_count
  FROM public.profiles p
  JOIN public.scans s ON s.user_id = p.id
  WHERE s.health_score IS NOT NULL
  GROUP BY p.id, p.username
  HAVING COUNT(s.id) >= 1
  ORDER BY AVG(s.health_score) DESC NULLS LAST, COUNT(s.id) DESC
  LIMIT 500;
$$;
