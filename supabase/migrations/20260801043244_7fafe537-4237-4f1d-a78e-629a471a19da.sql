GRANT SELECT ON public.question_bank TO anon;
GRANT SELECT ON public.exam_metadata TO anon;
GRANT SELECT ON public.test_series TO anon;

CREATE POLICY "Public can read questions" ON public.question_bank FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read exam metadata" ON public.exam_metadata FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read test series" ON public.test_series FOR SELECT TO anon USING (true);