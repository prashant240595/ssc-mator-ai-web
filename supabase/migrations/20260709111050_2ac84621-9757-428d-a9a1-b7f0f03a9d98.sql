
-- 1. Add gender column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male','female','other'));

-- 2. Rewrite auto-friend trigger function: only ONE random AI, only for male users, status pending, no auto DM
CREATE OR REPLACE FUNCTION public.auto_friend_ai_bots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  bot_id uuid;
BEGIN
  IF NEW.is_ai THEN RETURN NEW; END IF;
  IF NEW.gender IS DISTINCT FROM 'male' THEN RETURN NEW; END IF;

  -- Skip if this user already has any partner_request from an AI bot
  IF EXISTS (
    SELECT 1 FROM public.partner_requests pr
    JOIN public.profiles p ON p.id = pr.requester_id
    WHERE pr.addressee_id = NEW.id AND p.is_ai = true
  ) THEN
    RETURN NEW;
  END IF;

  SELECT id INTO bot_id
  FROM public.profiles
  WHERE is_ai = true
  ORDER BY random()
  LIMIT 1;

  IF bot_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.partner_requests(requester_id, addressee_id, status)
    VALUES (bot_id, NEW.id, 'pending')
    ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- 3. Drop old triggers and re-attach on INSERT + gender UPDATE
DROP TRIGGER IF EXISTS auto_friend_ai_bots_trg ON public.profiles;
DROP TRIGGER IF EXISTS trg_auto_friend_ai_bots ON public.profiles;
DROP TRIGGER IF EXISTS auto_friend_ai_bots_after_insert ON public.profiles;

CREATE TRIGGER auto_friend_ai_bots_after_upsert
AFTER INSERT OR UPDATE OF gender ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_friend_ai_bots();
