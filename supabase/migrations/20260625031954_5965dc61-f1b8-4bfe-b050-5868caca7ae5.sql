
CREATE OR REPLACE FUNCTION public.admin_list_subjects()
RETURNS TABLE(subject text, question_count bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT subject, COUNT(*)::bigint
  FROM public.question_bank
  WHERE subject IS NOT NULL AND deleted_at IS NULL
  GROUP BY subject ORDER BY subject;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_topics(p_subject text)
RETURNS TABLE(topic text, question_count bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT topic_name, COUNT(*)::bigint
  FROM public.question_bank
  WHERE subject = p_subject AND topic_name IS NOT NULL AND deleted_at IS NULL
  GROUP BY topic_name ORDER BY topic_name;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_exam_names(p_category text)
RETURNS TABLE(exam_name text, question_count bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT exam_name, COUNT(*)::bigint
  FROM public.question_bank
  WHERE category_type = p_category
    AND exam_name IS NOT NULL
    AND deleted_at IS NULL
  GROUP BY exam_name ORDER BY exam_name;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_shifts(p_category text, p_exam text)
RETURNS TABLE(shift text, question_count bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(shift_details, '—') AS shift, COUNT(*)::bigint
  FROM public.question_bank
  WHERE category_type = p_category
    AND exam_name = p_exam
    AND deleted_at IS NULL
  GROUP BY 1 ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_subjects() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_topics(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_exam_names(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_shifts(text, text) TO authenticated;
