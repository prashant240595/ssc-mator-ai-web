CREATE TABLE public.question_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_bookmarks TO authenticated;
GRANT ALL ON public.question_bookmarks TO service_role;
ALTER TABLE public.question_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bookmarks" ON public.question_bookmarks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_qb_user ON public.question_bookmarks(user_id, created_at DESC);