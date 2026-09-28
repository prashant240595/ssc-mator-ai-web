
CREATE OR REPLACE FUNCTION public.list_subjects()
RETURNS TABLE(subject text, question_count bigint)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT subject, COUNT(*)::bigint
  FROM public.question_bank
  WHERE subject IS NOT NULL
    AND topic_name IS NOT NULL
    AND deleted_at IS NULL
  GROUP BY subject
  ORDER BY subject;
$$;

CREATE OR REPLACE FUNCTION public.list_topics(p_subject text)
RETURNS TABLE(topic text, question_count bigint)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT topic_name, COUNT(*)::bigint
  FROM public.question_bank
  WHERE subject = p_subject
    AND topic_name IS NOT NULL
    AND deleted_at IS NULL
  GROUP BY topic_name
  ORDER BY topic_name;
$$;

GRANT EXECUTE ON FUNCTION public.list_subjects() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_topics(text) TO anon, authenticated;
