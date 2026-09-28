select cron.schedule('generate-daily-quiz', '30 0 * * *', $$
  SELECT net.http_post(
    url := 'https://sscmentorai.online/api/public/hooks/generate-daily-quiz',
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$$);

select cron.schedule('generate-daily-current-affairs', '45 0 * * *', $$
  SELECT net.http_post(
    url := 'https://sscmentorai.online/api/public/hooks/generate-current-affairs',
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$$);

select cron.schedule('generate-daily-quiz-retry', '20 1,3,6,9 * * *', $$
  SELECT net.http_post(
    url := 'https://sscmentorai.online/api/public/hooks/generate-daily-quiz',
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$$);

select cron.schedule('generate-daily-current-affairs-retry', '35 1,3,6,9 * * *', $$
  SELECT net.http_post(
    url := 'https://sscmentorai.online/api/public/hooks/generate-current-affairs',
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$$);