
-- ==================== DAILY QUIZZES ====================
CREATE TABLE public.daily_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_date date NOT NULL UNIQUE,
  question_ids uuid[] NOT NULL,
  created_by_type text NOT NULL DEFAULT 'ai' CHECK (created_by_type IN ('ai','admin')),
  created_by uuid REFERENCES auth.users(id),
  published boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.daily_quizzes TO authenticated, anon;
GRANT ALL ON public.daily_quizzes TO service_role;

ALTER TABLE public.daily_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published daily quizzes"
  ON public.daily_quizzes FOR SELECT
  USING (published = true);

CREATE POLICY "Admin can manage daily quizzes"
  ON public.daily_quizzes FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');

CREATE TRIGGER update_daily_quizzes_updated_at
  BEFORE UPDATE ON public.daily_quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== DAILY QUIZ ATTEMPTS ====================
CREATE TABLE public.daily_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.daily_quizzes(id) ON DELETE CASCADE,
  quiz_date date NOT NULL,
  correct_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL DEFAULT 0,
  answers jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, quiz_id)
);

CREATE INDEX idx_daily_attempts_user_date ON public.daily_quiz_attempts(user_id, quiz_date DESC);

GRANT SELECT, INSERT ON public.daily_quiz_attempts TO authenticated;
GRANT ALL ON public.daily_quiz_attempts TO service_role;

ALTER TABLE public.daily_quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own attempts" ON public.daily_quiz_attempts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==================== USER STREAKS ====================
CREATE TABLE public.user_streaks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  freeze_available integer NOT NULL DEFAULT 1,
  total_active_days integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_streaks TO authenticated;
GRANT ALL ON public.user_streaks TO service_role;

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own streak" ON public.user_streaks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ==================== STREAK UPDATE FUNCTION ====================
CREATE OR REPLACE FUNCTION public.bump_user_streak(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last date;
  v_current integer;
  v_longest integer;
  v_freeze integer;
  v_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  v_gap integer;
BEGIN
  SELECT last_activity_date, current_streak, longest_streak, freeze_available
    INTO v_last, v_current, v_longest, v_freeze
  FROM public.user_streaks WHERE user_id = _user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_streaks(user_id, current_streak, longest_streak, last_activity_date, total_active_days)
      VALUES(_user_id, 1, 1, v_today, 1);
    RETURN;
  END IF;

  IF v_last = v_today THEN
    RETURN; -- already counted today
  END IF;

  v_gap := v_today - v_last;

  IF v_gap = 1 THEN
    v_current := v_current + 1;
  ELSIF v_gap = 2 AND v_freeze > 0 THEN
    v_current := v_current + 1;
    v_freeze := v_freeze - 1;
  ELSE
    v_current := 1;
  END IF;

  IF v_current > v_longest THEN v_longest := v_current; END IF;

  -- grant a freeze every 7 active days (cap at 2)
  IF (SELECT total_active_days + 1 FROM public.user_streaks WHERE user_id = _user_id) % 7 = 0 THEN
    v_freeze := LEAST(v_freeze + 1, 2);
  END IF;

  UPDATE public.user_streaks
     SET current_streak = v_current,
         longest_streak = v_longest,
         last_activity_date = v_today,
         freeze_available = v_freeze,
         total_active_days = total_active_days + 1,
         updated_at = now()
   WHERE user_id = _user_id;
END;
$$;

-- Trigger: bump streak on daily quiz attempt
CREATE OR REPLACE FUNCTION public.trg_streak_daily_quiz()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.bump_user_streak(NEW.user_id);
  RETURN NEW;
END; $$;

CREATE TRIGGER daily_quiz_streak_trg
  AFTER INSERT ON public.daily_quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.trg_streak_daily_quiz();

-- Trigger: bump streak on any test attempt (student_results)
CREATE OR REPLACE FUNCTION public.trg_streak_student_result()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.bump_user_streak(NEW.user_id);
  RETURN NEW;
END; $$;

CREATE TRIGGER student_results_streak_trg
  AFTER INSERT ON public.student_results
  FOR EACH ROW EXECUTE FUNCTION public.trg_streak_student_result();

-- ==================== CRON JOBS ====================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Daily quiz generation: 6 AM IST = 00:30 UTC
SELECT cron.schedule(
  'generate-daily-quiz',
  '30 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ssc-ai-mentor.lovable.app/api/public/hooks/generate-daily-quiz',
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := '{}'::jsonb
  );
  $$
);

-- Comeback notifications: 7 PM IST = 13:30 UTC
SELECT cron.schedule(
  'comeback-notify',
  '30 13 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ssc-ai-mentor.lovable.app/api/public/hooks/comeback-notify',
    headers := jsonb_build_object('Content-Type','application/json','apikey', public.fcm_anon_key()),
    body := '{}'::jsonb
  );
  $$
);
