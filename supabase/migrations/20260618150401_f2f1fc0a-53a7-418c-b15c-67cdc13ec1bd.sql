
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free','pro','pro_plus'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_unique
  ON public.profiles (lower(email)) WHERE email IS NOT NULL;

DROP FUNCTION IF EXISTS public.consume_scan_quota(integer);

CREATE OR REPLACE FUNCTION public.consume_scan_quota()
RETURNS TABLE(new_count integer, scan_limit integer, plan text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _count int;
  _plan text;
  _expires timestamptz;
  _limit int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT scan_count, profiles.plan, plan_expires_at
    INTO _count, _plan, _expires
    FROM public.profiles
    WHERE id = _uid
    FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (id) VALUES (_uid);
    _count := 0;
    _plan := 'free';
    _expires := NULL;
  END IF;

  -- Expired paid plans fall back to free
  IF _plan IN ('pro','pro_plus') AND _expires IS NOT NULL AND _expires < now() THEN
    _plan := 'free';
  END IF;

  _limit := CASE _plan
    WHEN 'pro_plus' THEN 120
    WHEN 'pro' THEN 60
    ELSE 30
  END;

  IF _count >= _limit THEN
    RAISE EXCEPTION 'quota_exceeded';
  END IF;

  UPDATE public.profiles
    SET scan_count = _count + 1
    WHERE id = _uid;

  new_count := _count + 1;
  scan_limit := _limit;
  plan := _plan;
  RETURN NEXT;
END;
$function$;
