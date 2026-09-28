CREATE TABLE public.exam_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_name TEXT NOT NULL UNIQUE,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('pyq','mock_test')),
  total_time_minutes INTEGER NOT NULL DEFAULT 60,
  negative_marking NUMERIC(4,2) NOT NULL DEFAULT 0.50,
  exam_summary TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_metadata TO authenticated;
GRANT ALL ON public.exam_metadata TO service_role;

ALTER TABLE public.exam_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read exam metadata" ON public.exam_metadata
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert exam metadata" ON public.exam_metadata
  FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');
CREATE POLICY "Admin can update exam metadata" ON public.exam_metadata
  FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');
CREATE POLICY "Admin can delete exam metadata" ON public.exam_metadata
  FOR DELETE TO authenticated USING ((auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');

CREATE TRIGGER update_exam_metadata_updated_at
  BEFORE UPDATE ON public.exam_metadata
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();