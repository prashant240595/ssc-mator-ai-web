UPDATE public.question_bank
SET exam_name = exam_name || ' (2025)'
WHERE category_type = 'exam_series'
  AND exam_type = 'pyq'
  AND exam_name IS NOT NULL
  AND exam_name !~ '\(\d{4}\)\s*$';

UPDATE public.exam_metadata
SET exam_name = exam_name || ' (2025)'
WHERE exam_name IS NOT NULL
  AND exam_name !~ '\(\d{4}\)\s*$'
  AND EXISTS (
    SELECT 1 FROM public.question_bank qb
    WHERE qb.exam_type = 'pyq' AND qb.exam_name = exam_metadata.exam_name || ' (2025)'
  );