
-- Roles enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'founder', 'collaborator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Security-definer role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Unlimited check for admin/founder/collaborator
CREATE OR REPLACE FUNCTION public.has_unlimited_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','founder','collaborator')
  )
$$;

-- Update consume_scan_quota to bypass for unlimited users
CREATE OR REPLACE FUNCTION public.consume_scan_quota(_uid uuid)
RETURNS TABLE(new_count integer, scan_limit integer, plan text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    UPDATE public.profiles SET scan_count = _count + 1 WHERE id = _uid;
    new_count := _count + 1;
    scan_limit := 999999;
    plan := 'unlimited';
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
$$;
