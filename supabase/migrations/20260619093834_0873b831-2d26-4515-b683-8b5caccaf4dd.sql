
CREATE TABLE public.barcode_cache (
  barcode TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  rating TEXT NOT NULL,
  health_score INTEGER NOT NULL,
  calories_kcal INTEGER NOT NULL,
  summary TEXT,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.barcode_cache TO authenticated, anon;
GRANT ALL ON public.barcode_cache TO service_role;
ALTER TABLE public.barcode_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Barcode cache is publicly readable"
  ON public.barcode_cache FOR SELECT
  USING (true);
