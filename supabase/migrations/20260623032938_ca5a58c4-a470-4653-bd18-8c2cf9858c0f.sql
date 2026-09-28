
CREATE OR REPLACE FUNCTION public.list_exam_series(p_type text)
RETURNS TABLE(exam text, question_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT
    CASE WHEN p_type = 'pyq'
      THEN regexp_replace(exam_name, '\s*\(\d{4}\)\s*$', '')
      ELSE exam_name
    END AS exam,
    COUNT(*)::bigint AS question_count
  FROM public.question_bank
  WHERE category_type = 'exam_series'
    AND exam_type = p_type
    AND exam_name IS NOT NULL
    AND deleted_at IS NULL
  GROUP BY 1
  ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION public.list_exam_years(p_exam text)
RETURNS TABLE(year text, question_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT
    COALESCE(substring(exam_name FROM '\((\d{4})\)\s*$'), 'Unknown') AS year,
    COUNT(*)::bigint AS question_count
  FROM public.question_bank
  WHERE category_type = 'exam_series'
    AND exam_type = 'pyq'
    AND deleted_at IS NULL
    AND (exam_name = p_exam OR exam_name ILIKE p_exam || ' (%')
  GROUP BY 1
  ORDER BY 1 DESC;
$$;

CREATE OR REPLACE FUNCTION public.list_exam_shifts(p_type text, p_exam text)
RETURNS TABLE(shift text, question_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT
    COALESCE(shift_details, 'Full Paper') AS shift,
    COUNT(*)::bigint AS question_count
  FROM public.question_bank
  WHERE category_type = 'exam_series'
    AND exam_type = p_type
    AND exam_name = p_exam
    AND deleted_at IS NULL
  GROUP BY 1
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.list_exam_series(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_exam_years(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_exam_shifts(text, text) TO authenticated;
