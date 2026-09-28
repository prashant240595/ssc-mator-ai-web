
CREATE TABLE public.question_bank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  topic JSONB NOT NULL,
  text JSONB NOT NULL,
  options JSONB NOT NULL,
  correct INTEGER NOT NULL,
  explanation JSONB NOT NULL,
  image_svg TEXT,
  image_url TEXT,
  source_pdf TEXT,
  difficulty TEXT,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_bank TO authenticated;
GRANT ALL ON public.question_bank TO service_role;

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read questions"
  ON public.question_bank FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can insert questions"
  ON public.question_bank FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');

CREATE POLICY "Admin can update questions"
  ON public.question_bank FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');

CREATE POLICY "Admin can delete questions"
  ON public.question_bank FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_question_bank_updated_at
  BEFORE UPDATE ON public.question_bank
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
