CREATE OR REPLACE FUNCTION public.consume_scan_quota(_free_limit int)
RETURNS TABLE(new_count int, subscribed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _count int;
  _is_sub boolean;
  _expires timestamptz;
  _active_sub boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT scan_count, is_subscribed, subscription_expires_at
    INTO _count, _is_sub, _expires
    FROM public.profiles
    WHERE id = _uid
    FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (id) VALUES (_uid);
    _count := 0;
    _is_sub := false;
    _expires := NULL;
  END IF;

  _active_sub := COALESCE(_is_sub, false) AND (_expires IS NULL OR _expires > now());

  IF NOT _active_sub AND _count >= _free_limit THEN
    RAISE EXCEPTION 'quota_exceeded';
  END IF;

  UPDATE public.profiles
    SET scan_count = _count + 1
    WHERE id = _uid;

  new_count := _count + 1;
  subscribed := _active_sub;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_scan_quota(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_scan_quota(int) TO authenticated, service_role;