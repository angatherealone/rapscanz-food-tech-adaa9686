
DROP FUNCTION IF EXISTS public.consume_scan_quota();

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

  IF _plan IN ('pro','pro_plus','pro_max') AND _expires IS NOT NULL AND _expires < now() THEN
    _plan := 'free';
  END IF;

  _limit := CASE _plan
    WHEN 'pro_max' THEN 240
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

REVOKE ALL ON FUNCTION public.consume_scan_quota(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_scan_quota(uuid) TO service_role;
