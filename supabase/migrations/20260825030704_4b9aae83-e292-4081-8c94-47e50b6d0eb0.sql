CREATE TABLE IF NOT EXISTS public.app_flags (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_flags TO authenticated;
GRANT SELECT ON public.app_flags TO anon;
GRANT ALL ON public.app_flags TO service_role;

ALTER TABLE public.app_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_flags readable by everyone" ON public.app_flags;
CREATE POLICY "app_flags readable by everyone"
ON public.app_flags FOR SELECT TO anon, authenticated USING (true);