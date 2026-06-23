REVOKE ALL ON FUNCTION public.claim_trial_scan(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_trial_scan(uuid, text) TO service_role;