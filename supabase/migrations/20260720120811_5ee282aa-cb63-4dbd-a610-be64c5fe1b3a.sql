
-- Support multiple daily quiz types (mixed + current affairs)
ALTER TABLE public.daily_quizzes
  ADD COLUMN IF NOT EXISTS quiz_type text NOT NULL DEFAULT 'mixed';

ALTER TABLE public.daily_quizzes
  DROP CONSTRAINT IF EXISTS daily_quizzes_quiz_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS daily_quizzes_date_type_uniq
  ON public.daily_quizzes(quiz_date, quiz_type);

-- Schedule a second cron for Current Affairs generation at 6:15 AM IST
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-current-affairs') THEN
    PERFORM cron.unschedule('generate-daily-current-affairs');
  END IF;
END $$;

SELECT cron.schedule(
  'generate-daily-current-affairs',
  '45 0 * * *', -- 00:45 UTC = 06:15 IST
  $$
  SELECT net.http_post(
    url := 'https://ssc-ai-mentor.lovable.app/api/public/hooks/generate-current-affairs',
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := '{}'::jsonb
  );
  $$
);
