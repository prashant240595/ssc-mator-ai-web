
CREATE OR REPLACE FUNCTION public.notify_new_daily_quiz()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := public.fcm_notify_url(),
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := jsonb_build_object(
      'type','new_daily_quiz',
      'quiz_type', COALESCE(NEW.quiz_type,'mixed'),
      'quiz_date', NEW.quiz_date::text
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_daily_quiz ON public.daily_quizzes;
CREATE TRIGGER trg_notify_new_daily_quiz
AFTER INSERT ON public.daily_quizzes
FOR EACH ROW EXECUTE FUNCTION public.notify_new_daily_quiz();

CREATE OR REPLACE FUNCTION public.notify_new_blog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.published IS NOT TRUE THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.published,false) = true THEN
    RETURN NEW;
  END IF;
  PERFORM net.http_post(
    url := public.fcm_notify_url(),
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := jsonb_build_object(
      'type','new_blog',
      'slug', NEW.slug,
      'title', NEW.title,
      'excerpt', NEW.excerpt
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_blog ON public.blog_posts;
CREATE TRIGGER trg_notify_new_blog
AFTER INSERT OR UPDATE OF published ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.notify_new_blog();
