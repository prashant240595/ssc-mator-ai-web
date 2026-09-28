
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

  IF TG_OP = 'UPDATE' THEN
    -- If gender switched to female/other, remove any pending AI friend request
    IF NEW.gender IS DISTINCT FROM OLD.gender AND NEW.gender IN ('female','other') THEN
      DELETE FROM public.partner_requests pr
      USING public.profiles p
      WHERE pr.addressee_id = NEW.id
        AND pr.status = 'pending'
        AND pr.requester_id = p.id
        AND p.is_ai = true;
      RETURN NEW;
    END IF;
    -- On update: only continue when gender flips to male (INSERT path handles new users)
    IF NOT (NEW.gender IS DISTINCT FROM OLD.gender AND NEW.gender = 'male') THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Skip if user already has any partner_request from an AI bot
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

-- Backfill: any existing real user without an AI friend request gets one
DO $$
DECLARE
  u record;
  bot_id uuid;
BEGIN
  FOR u IN
    SELECT p.id FROM public.profiles p
    WHERE p.is_ai = false
      AND COALESCE(p.gender, 'male') <> 'female'
      AND COALESCE(p.gender, 'male') <> 'other'
      AND NOT EXISTS (
        SELECT 1 FROM public.partner_requests pr
        JOIN public.profiles bp ON bp.id = pr.requester_id AND bp.is_ai = true
        WHERE pr.addressee_id = p.id
      )
  LOOP
    SELECT id INTO bot_id FROM public.profiles WHERE is_ai = true ORDER BY random() LIMIT 1;
    IF bot_id IS NOT NULL THEN
      INSERT INTO public.partner_requests(requester_id, addressee_id, status)
        VALUES (bot_id, u.id, 'pending')
        ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Admin can view friend requests addressed to AI buddies
DROP POLICY IF EXISTS "admin views ai partner requests" ON public.partner_requests;
CREATE POLICY "admin views ai partner requests"
ON public.partner_requests
FOR SELECT
TO authenticated
USING (
  lower(coalesce(auth.jwt()->>'email','')) = 'prashant.singh.2405@gmail.com'
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = addressee_id AND p.is_ai = true)
);

-- Admin can accept/reject friend requests addressed to AI buddies
DROP POLICY IF EXISTS "admin updates ai partner requests" ON public.partner_requests;
CREATE POLICY "admin updates ai partner requests"
ON public.partner_requests
FOR UPDATE
TO authenticated
USING (
  lower(coalesce(auth.jwt()->>'email','')) = 'prashant.singh.2405@gmail.com'
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = addressee_id AND p.is_ai = true)
)
WITH CHECK (
  lower(coalesce(auth.jwt()->>'email','')) = 'prashant.singh.2405@gmail.com'
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = addressee_id AND p.is_ai = true)
);
