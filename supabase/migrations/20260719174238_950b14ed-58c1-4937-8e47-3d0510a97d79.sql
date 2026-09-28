
CREATE OR REPLACE FUNCTION public.notify_new_test()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := public.fcm_notify_url(),
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := jsonb_build_object(
      'type','new_test',
      'test_id', NEW.id,
      'title', NEW.title,
      'question_count', NEW.question_count
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_test ON public.test_series;
CREATE TRIGGER trg_notify_new_test
AFTER INSERT ON public.test_series
FOR EACH ROW EXECUTE FUNCTION public.notify_new_test();
