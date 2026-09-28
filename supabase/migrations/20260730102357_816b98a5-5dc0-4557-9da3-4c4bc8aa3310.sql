CREATE OR REPLACE FUNCTION public.fcm_notify_url()
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$ SELECT 'https://sscmentorai.online/api/public/hooks/fcm-notify' $function$;