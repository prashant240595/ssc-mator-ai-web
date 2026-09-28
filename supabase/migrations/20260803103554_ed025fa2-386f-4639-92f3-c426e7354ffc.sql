CREATE OR REPLACE FUNCTION public.notify_new_blog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      'excerpt', NEW.excerpt,
      'post_type', COALESCE(NEW.post_type,'blog')
    )
  );
  RETURN NEW;
END;
$$;