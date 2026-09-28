
-- Add soft-delete columns
ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.test_series
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE INDEX IF NOT EXISTS qb_deleted_at_idx ON public.question_bank(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS ts_deleted_at_idx ON public.test_series(deleted_at) WHERE deleted_at IS NOT NULL;

-- Replace read policies so soft-deleted rows are hidden from normal queries.
-- Admin (matched by email) keeps full visibility so the Junk view can list them.
DROP POLICY IF EXISTS "Authenticated can read questions" ON public.question_bank;
CREATE POLICY "Authenticated can read questions"
  ON public.question_bank FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    OR (auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com'
  );

DROP POLICY IF EXISTS "Authenticated can read test series" ON public.test_series;
CREATE POLICY "Authenticated can read test series"
  ON public.test_series FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    OR (auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com'
  );

-- Auto-purge function: hard-delete rows that have sat in the junk for >10 days.
CREATE OR REPLACE FUNCTION public.purge_old_junk()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.question_bank
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - interval '10 days';

  DELETE FROM public.test_series
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - interval '10 days';
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_junk() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_old_junk() TO service_role;

-- Schedule daily purge at 02:30 UTC via pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-junk-questions-daily') THEN
    PERFORM cron.unschedule('purge-junk-questions-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'purge-junk-questions-daily',
  '30 2 * * *',
  $$SELECT public.purge_old_junk();$$
);
