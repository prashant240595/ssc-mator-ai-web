ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS shift text;
CREATE INDEX IF NOT EXISTS idx_student_results_exam_shift ON public.student_results(exam_id, shift, total_score DESC);