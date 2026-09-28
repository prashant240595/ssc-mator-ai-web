CREATE TABLE public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text,
  category text not null default 'bug',
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT ON public.user_feedback TO authenticated;
GRANT ALL ON public.user_feedback TO service_role;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own feedback" ON public.user_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own feedback or admin" ON public.user_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id OR (auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');
CREATE POLICY "Admin updates feedback" ON public.user_feedback FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com') WITH CHECK ((auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');
GRANT UPDATE ON public.user_feedback TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_feedback_weekly_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_feedback
    WHERE user_id = NEW.user_id AND created_at > now() - interval '7 days'
  ) THEN
    RAISE EXCEPTION 'You can send only one message per week. Please try again later.';
  END IF;
  IF length(btrim(NEW.message)) < 10 THEN
    RAISE EXCEPTION 'Message is too short.';
  END IF;
  IF length(NEW.message) > 2000 THEN
    RAISE EXCEPTION 'Message is too long.';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_feedback_weekly_limit BEFORE INSERT ON public.user_feedback
FOR EACH ROW EXECUTE FUNCTION public.enforce_feedback_weekly_limit();