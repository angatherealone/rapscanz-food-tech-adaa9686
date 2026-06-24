
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS free_unlimited boolean NOT NULL DEFAULT false;

-- Revert prior admin/pro_max grant for this user; mark as free unlimited instead.
DELETE FROM public.user_roles
  WHERE user_id = 'd958c4b6-2580-4864-99b4-2d83a9a74c80'
    AND role = 'admin'::public.app_role;

UPDATE public.profiles
  SET plan = 'free',
      plan_expires_at = NULL,
      is_subscribed = false,
      free_unlimited = true,
      scan_count = 0
  WHERE id = 'd958c4b6-2580-4864-99b4-2d83a9a74c80';

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
  _free_unlimited boolean;
  _trial jsonb;
  _tier text;
  _tier_avail int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('scan:' || _uid::text, 0));

  SELECT public.has_unlimited_access(_uid) INTO _unlimited;

  SELECT scan_count, profiles.plan, plan_expires_at, trial_remaining, free_unlimited
    INTO _count, _plan, _expires, _trial, _free_unlimited
    FROM public.profiles
    WHERE id = _uid
    FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (id) VALUES (_uid);
    _count := 0;
    _plan := 'free';
    _expires := NULL;
    _trial := '{"pro":0,"pro_plus":0,"pro_max":0}'::jsonb;
    _free_unlimited := false;
  END IF;

  -- Admin / founder / collaborator: full unlimited Pro Max.
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

  -- Free unlimited: unlimited scan count, but stays on FREE tier (no Pro features).
  IF _free_unlimited THEN
    new_count := _count;
    scan_limit := 999999;
    plan := 'free';
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

  IF _count < _limit THEN
    UPDATE public.profiles SET scan_count = _count + 1 WHERE id = _uid;
    new_count := _count + 1;
    scan_limit := _limit;
    plan := _plan;
    RETURN NEXT;
    RETURN;
  END IF;

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
