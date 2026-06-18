
-- 1. Health profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weight_kg numeric(5,2),
  ADD COLUMN IF NOT EXISTS height_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS illnesses text,
  ADD COLUMN IF NOT EXISTS allergies text;

ALTER TABLE public.profiles
  ADD CONSTRAINT weight_range CHECK (weight_kg IS NULL OR (weight_kg > 0 AND weight_kg < 500)),
  ADD CONSTRAINT height_range CHECK (height_cm IS NULL OR (height_cm > 0 AND height_cm < 300)),
  ADD CONSTRAINT illnesses_len CHECK (illnesses IS NULL OR char_length(illnesses) <= 500),
  ADD CONSTRAINT allergies_len CHECK (allergies IS NULL OR char_length(allergies) <= 500);

GRANT UPDATE (username, weight_kg, height_cm, illnesses, allergies) ON public.profiles TO authenticated;

-- 2. Calories on scans
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS calories_kcal smallint;

-- 3. Consumption log
CREATE TABLE IF NOT EXISTS public.consumption (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scan_id uuid REFERENCES public.scans(id) ON DELETE SET NULL,
  product_name text,
  calories_kcal smallint NOT NULL DEFAULT 0,
  consumed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.consumption TO authenticated;
GRANT ALL ON public.consumption TO service_role;

ALTER TABLE public.consumption ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own consumption" ON public.consumption
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own consumption" ON public.consumption
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own consumption" ON public.consumption
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS consumption_user_date_idx ON public.consumption (user_id, consumed_at DESC);
