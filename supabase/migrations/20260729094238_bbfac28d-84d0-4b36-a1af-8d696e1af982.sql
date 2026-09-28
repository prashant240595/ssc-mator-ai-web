
CREATE OR REPLACE FUNCTION public.notify_new_exam()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_type text;
  v_title text;
BEGIN
  v_type := CASE WHEN NEW.exam_type = 'pyq' THEN 'New PYQ available 📚' ELSE 'New mock test available 📝' END;
  v_title := NEW.exam_name;
  PERFORM net.http_post(
    url := public.fcm_notify_url(),
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := jsonb_build_object(
      'type','new_test',
      'test_id', NEW.id,
      'title', v_title,
      'question_count', 0
    )
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_new_exam ON public.exam_metadata;
CREATE TRIGGER trg_notify_new_exam
AFTER INSERT ON public.exam_metadata
FOR EACH ROW EXECUTE FUNCTION public.notify_new_exam();
