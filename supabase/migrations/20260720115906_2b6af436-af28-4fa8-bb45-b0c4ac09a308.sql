
-- Fix group message notify trigger: column is user_id, not sender_id
CREATE OR REPLACE FUNCTION public.notify_group_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := public.fcm_notify_url(),
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := jsonb_build_object(
      'type','group_message',
      'group_id', NEW.group_id,
      'sender_id', NEW.user_id,
      'content', NEW.content
    )
  );
  RETURN NEW;
END;
$function$;

-- Exclude daily quiz questions from subject/topic listings
CREATE OR REPLACE FUNCTION public.list_subjects()
 RETURNS TABLE(subject text, question_count bigint)
 LANGUAGE sql STABLE
 SET search_path TO 'public'
AS $function$
  SELECT subject, COUNT(*)::bigint
  FROM public.question_bank
  WHERE subject IS NOT NULL
    AND topic_name IS NOT NULL
    AND deleted_at IS NULL
    AND COALESCE(category_type,'') <> 'daily_quiz'
  GROUP BY subject
  ORDER BY subject;
$function$;

CREATE OR REPLACE FUNCTION public.list_topics(p_subject text)
 RETURNS TABLE(topic text, question_count bigint)
 LANGUAGE sql STABLE
 SET search_path TO 'public'
AS $function$
  SELECT topic_name, COUNT(*)::bigint
  FROM public.question_bank
  WHERE subject = p_subject
    AND topic_name IS NOT NULL
    AND deleted_at IS NULL
    AND COALESCE(category_type,'') <> 'daily_quiz'
  GROUP BY topic_name
  ORDER BY topic_name;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_subjects()
 RETURNS TABLE(subject text, question_count bigint)
 LANGUAGE sql STABLE
 SET search_path TO 'public'
AS $function$
  SELECT subject, COUNT(*)::bigint
  FROM public.question_bank
  WHERE subject IS NOT NULL
    AND deleted_at IS NULL
    AND COALESCE(category_type,'') <> 'daily_quiz'
  GROUP BY subject ORDER BY subject;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_topics(p_subject text)
 RETURNS TABLE(topic text, question_count bigint)
 LANGUAGE sql STABLE
 SET search_path TO 'public'
AS $function$
  SELECT topic_name, COUNT(*)::bigint
  FROM public.question_bank
  WHERE subject = p_subject
    AND topic_name IS NOT NULL
    AND deleted_at IS NULL
    AND COALESCE(category_type,'') <> 'daily_quiz'
  GROUP BY topic_name ORDER BY topic_name;
$function$;
