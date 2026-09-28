CREATE TABLE public.revision_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  subject text,
  notes text,
  stage integer NOT NULL DEFAULT 0,
  next_review_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Kolkata')::date + 1),
  review_count integer NOT NULL DEFAULT 0,
  last_reviewed_at timestamp with time zone,
  last_difficulty text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.revision_topics TO authenticated;
GRANT ALL ON public.revision_topics TO service_role;

ALTER TABLE public.revision_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own revision topics"
ON public.revision_topics FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_revision_topics_user_due ON public.revision_topics (user_id, status, next_review_date);
CREATE INDEX idx_revision_topics_due ON public.revision_topics (next_review_date) WHERE status = 'active';

CREATE TRIGGER revision_topics_updated_at
BEFORE UPDATE ON public.revision_topics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'revision-reminders',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sscmentorai.online/api/public/hooks/revision-notify',
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);