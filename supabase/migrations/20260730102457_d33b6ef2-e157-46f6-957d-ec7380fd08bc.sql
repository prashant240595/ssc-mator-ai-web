CREATE OR REPLACE FUNCTION public.notify_new_exam()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_title text;
BEGIN
  v_title := CASE
    WHEN NEW.exam_type = 'pyq' THEN 'New PYQ available 📚'
    ELSE 'New mock test available 📝'
  END;

  PERFORM net.http_post(
    url := public.fcm_notify_url(),
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := jsonb_build_object(
      'type','new_test',
      'test_id', NEW.id,
      'title', NEW.exam_name,
      'notification_title', v_title,
      'exam_type', NEW.exam_type,
      'question_count', 0
    ),
    timeout_milliseconds := 30000
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_test()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url := public.fcm_notify_url(),
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := jsonb_build_object(
      'type','new_test',
      'test_id', NEW.id,
      'title', NEW.title,
      'notification_title', 'New mock test available 📝',
      'exam_type', 'mock_test',
      'question_count', NEW.question_count
    ),
    timeout_milliseconds := 30000
  );
  RETURN NEW;
END;
$function$;