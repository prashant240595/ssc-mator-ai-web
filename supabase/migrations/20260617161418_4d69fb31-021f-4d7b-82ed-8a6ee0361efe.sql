
-- 1) profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 3) user_activity_logs
CREATE TABLE public.user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.user_activity_logs TO authenticated;
GRANT ALL ON public.user_activity_logs TO service_role;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own activity" ON public.user_activity_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own activity" ON public.user_activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX user_activity_logs_user_id_created_at_idx ON public.user_activity_logs (user_id, created_at DESC);

-- 4) Add FK from student_results.user_id to profiles.id
ALTER TABLE public.student_results
  ADD CONSTRAINT student_results_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
