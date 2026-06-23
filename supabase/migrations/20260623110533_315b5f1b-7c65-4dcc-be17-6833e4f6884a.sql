-- Defense-in-depth: serialize all scan-quota and trial-claim operations
-- per user via a transaction-scoped advisory lock. Combined with the
-- existing FOR UPDATE on profiles, this guarantees that rapid retries
-- or parallel tabs cannot exceed the configured limits, even under
-- pathological connection-pool reordering.

CREATE OR REPLACE FUNCTION public.claim_trial_scan(_uid uuid, _tier text)
 RETURNS TABLE(claimed integer, remaining integer)
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

  -- Serialize concurrent calls for the same user (multiple tabs / rapid retries).
  PERFORM pg_advisory_xact_lock(hashtextextended('scan:' || _uid::text, 0));

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

REVOKE EXECUTE ON FUNCTION public.claim_trial_scan(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_trial_scan(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.consume_scan_quota(_uid uuid, _prefer_tier text DEFAULT NULL::text)
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

  -- Serialize concurrent calls for the same user. Any second call from
  -- another tab or a rapid retry waits here until the first commits, then
  -- re-reads the updated quota/trial counts below.
  PERFORM pg_advisory_xact_lock(hashtextextended('scan:' || _uid::text, 0));

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

  -- 1) Caller asked to spend a specific trial tier on this scan.
  IF _prefer_tier IS NOT NULL AND _prefer_tier IN ('pro','pro_plus','pro_max') THEN
    IF (
      (_plan = 'free' AND _prefer_tier IN ('pro','pro_plus','pro_max'))
      OR (_plan = 'pro' AND _prefer_tier IN ('pro_plus','pro_max'))
      OR (_plan = 'pro_plus' AND _prefer_tier = 'pro_max')
    ) THEN
      _tier_avail := COALESCE((_trial ->> _prefer_tier)::int, 0);
      IF _tier_avail > 0 THEN
        UPDATE public.profiles
          SET trial_remaining = jsonb_set(trial_remaining, ARRAY[_prefer_tier], to_jsonb(_tier_avail - 1))
          WHERE id = _uid;
        new_count := _count;
        scan_limit := _limit;
        plan := _prefer_tier;
        RETURN NEXT;
        RETURN;
      END IF;
    END IF;
  END IF;

  -- 2) Normal quota.
  IF _count < _limit THEN
    UPDATE public.profiles SET scan_count = _count + 1 WHERE id = _uid;
    new_count := _count + 1;
    scan_limit := _limit;
    plan := _plan;
    RETURN NEXT;
    RETURN;
  END IF;

  -- 3) Out of normal quota: fall back to any trial scan from the highest
  --    tier available above the current plan.
  FOREACH _tier IN ARRAY ARRAY['pro_max','pro_plus','pro']
  LOOP
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

REVOKE EXECUTE ON FUNCTION public.consume_scan_quota(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_scan_quota(uuid, text) TO service_role;

-- Drop the old single-arg overload so all callers go through the hardened
-- version above and there is no unguarded path to consume a scan.
DROP FUNCTION IF EXISTS public.consume_scan_quota(uuid);