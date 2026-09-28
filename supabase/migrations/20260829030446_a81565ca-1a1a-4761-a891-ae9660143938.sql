CREATE TABLE public.job_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text NOT NULL UNIQUE,
  source_title text,
  job_stage text NOT NULL DEFAULT 'notification',
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text,
  content_md text NOT NULL DEFAULT '',
  tags text[] DEFAULT '{}',
  meta_title text,
  meta_description text,
  status text NOT NULL DEFAULT 'pending',
  published_post_slug text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX job_drafts_status_idx ON public.job_drafts (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_drafts TO authenticated;
GRANT ALL ON public.job_drafts TO service_role;

ALTER TABLE public.job_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage job drafts"
ON public.job_drafts FOR ALL
TO authenticated
USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'prashant.singh.2405@gmail.com')
WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'prashant.singh.2405@gmail.com');

CREATE TRIGGER update_job_drafts_updated_at
BEFORE UPDATE ON public.job_drafts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

SELECT cron.schedule('scan-govt-jobs', '45 1 * * *', $$
  SELECT net.http_post(
    url := 'https://sscmentorai.online/api/public/hooks/scan-govt-jobs',
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := '{}'::jsonb,
    timeout_milliseconds := 180000
  );
$$);

SELECT cron.schedule('scan-govt-jobs-afternoon', '45 7 * * *', $$
  SELECT net.http_post(
    url := 'https://sscmentorai.online/api/public/hooks/scan-govt-jobs',
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := '{}'::jsonb,
    timeout_milliseconds := 180000
  );
$$);