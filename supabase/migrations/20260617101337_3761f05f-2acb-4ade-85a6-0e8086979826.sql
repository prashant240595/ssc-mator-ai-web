
ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS category_type text,
  ADD COLUMN IF NOT EXISTS topic_name text,
  ADD COLUMN IF NOT EXISTS exam_type text,
  ADD COLUMN IF NOT EXISTS exam_name text,
  ADD COLUMN IF NOT EXISTS shift_details text;

ALTER TABLE public.question_bank
  ALTER COLUMN topic DROP NOT NULL,
  ALTER COLUMN text DROP NOT NULL,
  ALTER COLUMN options DROP NOT NULL,
  ALTER COLUMN explanation DROP NOT NULL;

CREATE INDEX IF NOT EXISTS qb_subject_topic_idx ON public.question_bank (category_type, subject, topic_name);
CREATE INDEX IF NOT EXISTS qb_exam_idx ON public.question_bank (category_type, exam_type, exam_name, shift_details);
