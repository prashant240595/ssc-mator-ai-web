
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  cover_image TEXT,
  cover_alt TEXT,
  content_md TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}'::text[],
  reading_minutes INTEGER DEFAULT 5,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT DEFAULT 'SSC Mentor AI',
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX blog_posts_published_at_idx ON public.blog_posts (published, published_at DESC);
CREATE INDEX blog_posts_slug_idx ON public.blog_posts (slug);

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published posts"
  ON public.blog_posts FOR SELECT
  TO anon, authenticated
  USING (published = true);

CREATE POLICY "Admin can read all posts"
  ON public.blog_posts FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');

CREATE POLICY "Admin can insert posts"
  ON public.blog_posts FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');

CREATE POLICY "Admin can update posts"
  ON public.blog_posts FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');

CREATE POLICY "Admin can delete posts"
  ON public.blog_posts FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
