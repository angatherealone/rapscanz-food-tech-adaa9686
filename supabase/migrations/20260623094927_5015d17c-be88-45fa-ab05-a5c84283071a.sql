
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_claimed jsonb NOT NULL DEFAULT '{"pro":0,"pro_plus":0,"pro_max":0}'::jsonb,
  ADD COLUMN IF NOT EXISTS trial_remaining jsonb NOT NULL DEFAULT '{"pro":0,"pro_plus":0,"pro_max":0}'::jsonb;

CREATE OR REPLACE FUNCTION public.consume_scan_quota(_uid uuid)
 RETURNS TABLE(new_count integer, scan_limit integer, plan text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _count int;
  _plan text;
  _expires timestamptz;
  _limit int;
  _unlimited boolean;
  _trial jsonb;
  _tier text;
  _tier_avail int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT public.has_unlimited_access(_uid) INTO _unlimited;

  SELECT scan_count, profiles.plan, plan_expires_at, trial_remaining
    INTO _count, _plan, _expires, _trial
    FROM public.profiles
    WHERE id = _uid
    FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (id) VALUES (_uid);
    _count := 0;
    _plan := 'free';
    _expires := NULL;
    _trial := '{"pro":0,"pro_plus":0,"pro_max":0}'::jsonb;
  END IF;

  IF _unlimited THEN
    UPDATE public.profiles
      SET scan_count = _count + 1,
          plan = 'pro_max',
          plan_expires_at = 'infinity'::timestamptz,
          is_subscribed = true
      WHERE id = _uid;
    new_count := _count + 1;
    scan_limit := 999999;
    plan := 'pro_max';
    RETURN NEXT;
    RETURN;
  END IF;

  IF _plan IN ('pro','pro_plus','pro_max') AND _expires IS NOT NULL AND _expires < now() THEN
    _plan := 'free';
  END IF;

  _limit := CASE _plan
    WHEN 'pro_max' THEN 40
    WHEN 'pro_plus' THEN 30
    WHEN 'pro' THEN 20
    ELSE 10
  END;

  IF _count < _limit THEN
    UPDATE public.profiles SET scan_count = _count + 1 WHERE id = _uid;
    new_count := _count + 1;
    scan_limit := _limit;
    plan := _plan;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Out of normal quota; try trial scans from highest tier above current plan.
  FOREACH _tier IN ARRAY ARRAY['pro_max','pro_plus','pro']
  LOOP
    -- Only let trial tier elevate, never downgrade.
    IF (_plan = 'free')
       OR (_plan = 'pro' AND _tier IN ('pro_plus','pro_max'))
       OR (_plan = 'pro_plus' AND _tier = 'pro_max') THEN
      _tier_avail := COALESCE((_trial ->> _tier)::int, 0);
      IF _tier_avail > 0 THEN
        UPDATE public.profiles
          SET trial_remaining = jsonb_set(trial_remaining, ARRAY[_tier], to_jsonb(_tier_avail - 1))
          WHERE id = _uid;
        new_count := _count;
        scan_limit := _limit;
        plan := _tier;
        RETURN NEXT;
        RETURN;
      END IF;
    END IF;
  END LOOP;

  RAISE EXCEPTION 'quota_exceeded';
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_trial_scan(_uid uuid, _tier text)
 RETURNS TABLE(claimed int, remaining int)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _plan text;
  _expires timestamptz;
  _claimed jsonb;
  _trial jsonb;
  _claimed_n int;
  _remaining_n int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _tier NOT IN ('pro','pro_plus','pro_max') THEN RAISE EXCEPTION 'invalid_tier'; END IF;

  SELECT profiles.plan, plan_expires_at, trial_claimed, trial_remaining
    INTO _plan, _expires, _claimed, _trial
    FROM public.profiles WHERE id = _uid FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (id) VALUES (_uid);
    _plan := 'free';
    _claimed := '{"pro":0,"pro_plus":0,"pro_max":0}'::jsonb;
    _trial := '{"pro":0,"pro_plus":0,"pro_max":0}'::jsonb;
  END IF;

  IF _plan IN ('pro','pro_plus','pro_max') AND _expires IS NOT NULL AND _expires < now() THEN
    _plan := 'free';
  END IF;

  -- Tier must be strictly above current plan.
  IF NOT (
    (_plan = 'free' AND _tier IN ('pro','pro_plus','pro_max'))
    OR (_plan = 'pro' AND _tier IN ('pro_plus','pro_max'))
    OR (_plan = 'pro_plus' AND _tier = 'pro_max')
  ) THEN
    RAISE EXCEPTION 'tier_not_above_plan';
  END IF;

  _claimed_n := COALESCE((_claimed ->> _tier)::int, 0);
  IF _claimed_n >= 2 THEN RAISE EXCEPTION 'trial_limit_reached'; END IF;

  _remaining_n := COALESCE((_trial ->> _tier)::int, 0) + 1;

  UPDATE public.profiles
    SET trial_claimed = jsonb_set(trial_claimed, ARRAY[_tier], to_jsonb(_claimed_n + 1)),
        trial_remaining = jsonb_set(trial_remaining, ARRAY[_tier], to_jsonb(_remaining_n))
    WHERE id = _uid;

  claimed := _claimed_n + 1;
  remaining := _remaining_n;
  RETURN NEXT;
END;
$function$;
