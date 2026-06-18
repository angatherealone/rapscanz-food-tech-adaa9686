
-- 1. Username column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (lower(username)) WHERE username IS NOT NULL;
ALTER TABLE public.profiles ADD CONSTRAINT username_format CHECK (username IS NULL OR username ~ '^[a-zA-Z0-9_]{3,20}$');

-- Allow users to update their own username
GRANT UPDATE (username) ON public.profiles TO authenticated;

-- 2. Public leaderboard function (callable by anon + authenticated)
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE(username text, avg_score numeric, scan_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.username,
         ROUND(AVG(s.health_score)::numeric, 1) AS avg_score,
         COUNT(s.id) AS scan_count
  FROM public.profiles p
  JOIN public.scans s ON s.user_id = p.id
  WHERE p.username IS NOT NULL
    AND s.health_score IS NOT NULL
  GROUP BY p.username
  HAVING COUNT(s.id) >= 3
  ORDER BY AVG(s.health_score) DESC, COUNT(s.id) DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO anon, authenticated;

-- 3. Server-only subscription grant function (service_role only)
CREATE OR REPLACE FUNCTION public.grant_subscription(_user_id uuid, _days integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
    SET is_subscribed = true,
        subscription_expires_at = GREATEST(COALESCE(subscription_expires_at, now()), now()) + (_days || ' days')::interval
    WHERE id = _user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_subscription(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_subscription(uuid, integer) TO service_role;

-- 4. Razorpay payment log
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  razorpay_order_id text NOT NULL UNIQUE,
  razorpay_payment_id text,
  amount_paise integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);
