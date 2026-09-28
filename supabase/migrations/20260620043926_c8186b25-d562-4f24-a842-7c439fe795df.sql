
CREATE TABLE public.question_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, user_id)
);

CREATE INDEX idx_question_reports_question ON public.question_reports(question_id);

GRANT SELECT, INSERT, DELETE ON public.question_reports TO authenticated;
GRANT ALL ON public.question_reports TO service_role;

ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own reports"
  ON public.question_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own reports"
  ON public.question_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');

CREATE POLICY "Admin can delete reports"
  ON public.question_reports FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');
