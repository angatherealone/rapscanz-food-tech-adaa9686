
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan = ANY (ARRAY['free','pro','pro_plus','pro_max']));

UPDATE public.profiles p
SET plan = 'pro_max',
    plan_expires_at = 'infinity'::timestamptz,
    is_subscribed = true
WHERE EXISTS (
  SELECT 1 FROM public.user_roles r
  WHERE r.user_id = p.id
    AND r.role IN ('admin','founder','collaborator')
);

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
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT public.has_unlimited_access(_uid) INTO _unlimited;

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
    WHEN 'pro_max' THEN 240
    WHEN 'pro_plus' THEN 120
    WHEN 'pro' THEN 60
    ELSE 30
  END;

  IF _count >= _limit THEN
    RAISE EXCEPTION 'quota_exceeded';
  END IF;

  UPDATE public.profiles SET scan_count = _count + 1 WHERE id = _uid;

  new_count := _count + 1;
  scan_limit := _limit;
  plan := _plan;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_grant_admin_for_owners()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IS NOT NULL AND lower(NEW.email) IN ('kalaruhema@gmail.com','ani.shaynine@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    UPDATE public.profiles
      SET plan = 'pro_max',
          plan_expires_at = 'infinity'::timestamptz,
          is_subscribed = true
      WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;
