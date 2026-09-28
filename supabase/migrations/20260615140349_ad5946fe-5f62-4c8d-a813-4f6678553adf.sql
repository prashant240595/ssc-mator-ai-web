
CREATE TABLE public.test_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  source_pdf text,
  question_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_series TO authenticated;
GRANT ALL ON public.test_series TO service_role;

ALTER TABLE public.test_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read test series" ON public.test_series
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert test series" ON public.test_series
  FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');
CREATE POLICY "Admin can update test series" ON public.test_series
  FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');
CREATE POLICY "Admin can delete test series" ON public.test_series
  FOR DELETE TO authenticated USING ((auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');

CREATE TRIGGER update_test_series_updated_at
  BEFORE UPDATE ON public.test_series
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.question_bank
  ADD COLUMN test_series_id uuid REFERENCES public.test_series(id) ON DELETE SET NULL;

CREATE INDEX idx_question_bank_test_series ON public.question_bank(test_series_id);
