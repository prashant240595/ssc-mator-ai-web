ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'blog';
ALTER TABLE public.blog_posts DROP CONSTRAINT IF EXISTS blog_posts_post_type_check;
ALTER TABLE public.blog_posts ADD CONSTRAINT blog_posts_post_type_check CHECK (post_type IN ('blog','job'));
CREATE INDEX IF NOT EXISTS blog_posts_post_type_published_idx ON public.blog_posts (post_type, published, published_at DESC);