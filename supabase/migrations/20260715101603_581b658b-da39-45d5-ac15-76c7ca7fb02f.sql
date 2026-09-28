CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper: build POST URL (published site is stable across renames)
-- We hardcode the project preview URL constants used by the app.
CREATE OR REPLACE FUNCTION public.fcm_notify_url()
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$ SELECT 'https://ssc-ai-mentor.lovable.app/api/public/hooks/fcm-notify' $$;
REVOKE ALL ON FUNCTION public.fcm_notify_url() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fcm_anon_key()
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$ SELECT 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqcG1vaGZvdmtuZXpjdG9xZGV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTc0MDIsImV4cCI6MjA5NzA5MzQwMn0.VAXQQaz9jxeb9NUrmizNw3ycZQ0PBl7cSHekQzsuXrQ' $$;
REVOKE ALL ON FUNCTION public.fcm_anon_key() FROM PUBLIC, anon, authenticated;

-- Trigger fn: direct_messages
CREATE OR REPLACE FUNCTION public.notify_direct_message()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := public.fcm_notify_url(),
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := jsonb_build_object(
      'type','direct_message',
      'sender_id', NEW.sender_id,
      'receiver_id', NEW.receiver_id,
      'content', NEW.content
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_direct_message ON public.direct_messages;
CREATE TRIGGER trg_notify_direct_message
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_direct_message();

-- Trigger fn: group_messages
CREATE OR REPLACE FUNCTION public.notify_group_message()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := public.fcm_notify_url(),
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := jsonb_build_object(
      'type','group_message',
      'group_id', NEW.group_id,
      'sender_id', NEW.sender_id,
      'content', NEW.content
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_group_message ON public.group_messages;
CREATE TRIGGER trg_notify_group_message
  AFTER INSERT ON public.group_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_group_message();

-- Trigger fn: partner_requests (only on INSERT with status pending)
CREATE OR REPLACE FUNCTION public.notify_partner_request()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := public.fcm_notify_url(),
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := jsonb_build_object(
      'type','partner_request',
      'requester_id', NEW.requester_id,
      'addressee_id', NEW.addressee_id
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_partner_request ON public.partner_requests;
CREATE TRIGGER trg_notify_partner_request
  AFTER INSERT ON public.partner_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_partner_request();

-- Daily reminder at 9:00 AM IST = 03:30 UTC
SELECT cron.unschedule('fcm-daily-reminder')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fcm-daily-reminder');

SELECT cron.schedule(
  'fcm-daily-reminder',
  '30 3 * * *',
  $CRON$
  SELECT net.http_post(
    url := public.fcm_notify_url(),
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := jsonb_build_object('type','daily_reminder')
  );
  $CRON$
);