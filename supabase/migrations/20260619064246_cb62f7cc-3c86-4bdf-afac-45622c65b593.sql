
CREATE OR REPLACE FUNCTION public.auto_grant_admin_for_owners()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND lower(NEW.email) IN ('kalaruhema@gmail.com','ani.shaynine@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_grant_admin_for_owners ON public.profiles;
CREATE TRIGGER trg_auto_grant_admin_for_owners
AFTER INSERT OR UPDATE OF email ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.auto_grant_admin_for_owners();

-- Backfill for any existing profile rows with these emails
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM public.profiles
WHERE lower(email) IN ('kalaruhema@gmail.com','ani.shaynine@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
