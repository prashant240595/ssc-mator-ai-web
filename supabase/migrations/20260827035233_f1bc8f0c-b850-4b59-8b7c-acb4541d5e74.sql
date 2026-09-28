ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS job_stage text NOT NULL DEFAULT 'notification';
ALTER TABLE public.blog_posts DROP CONSTRAINT IF EXISTS blog_posts_job_stage_check;
ALTER TABLE public.blog_posts ADD CONSTRAINT blog_posts_job_stage_check CHECK (job_stage IN ('notification','admit_card','answer_key','result'));
CREATE INDEX IF NOT EXISTS blog_posts_job_stage_idx ON public.blog_posts (post_type, job_stage, published_at DESC);