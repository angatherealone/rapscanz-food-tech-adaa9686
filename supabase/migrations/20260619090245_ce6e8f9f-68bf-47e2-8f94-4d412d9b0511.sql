
CREATE TABLE public.scan_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scan_id uuid NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  buy_again text NOT NULL CHECK (buy_again IN ('yes','maybe','no')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, scan_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scan_feedback TO authenticated;
GRANT ALL ON public.scan_feedback TO service_role;

ALTER TABLE public.scan_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own feedback" ON public.scan_feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own feedback" ON public.scan_feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own feedback" ON public.scan_feedback
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own feedback" ON public.scan_feedback
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
