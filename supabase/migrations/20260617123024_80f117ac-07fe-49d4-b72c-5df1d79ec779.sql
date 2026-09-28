
ALTER TABLE public.exam_metadata
  ADD COLUMN IF NOT EXISTS correct_marks numeric NOT NULL DEFAULT 2.0;

CREATE TABLE IF NOT EXISTS public.student_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_id uuid NOT NULL REFERENCES public.exam_metadata(id) ON DELETE CASCADE,
  total_score numeric NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  incorrect_count integer NOT NULL DEFAULT 0,
  unattempted_count integer NOT NULL DEFAULT 0,
  display_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_results_exam ON public.student_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_student_results_user ON public.student_results(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_results TO authenticated;
GRANT ALL ON public.student_results TO service_role;

ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read all results"
  ON public.student_results FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users insert own results"
  ON public.student_results FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own results"
  ON public.student_results FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users delete own results"
  ON public.student_results FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_student_results_updated_at
  BEFORE UPDATE ON public.student_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
