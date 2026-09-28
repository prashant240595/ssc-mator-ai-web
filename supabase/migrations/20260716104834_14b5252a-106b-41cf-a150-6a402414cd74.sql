
-- Ensure the SSC Mentor AI profile exists (idempotent) via a fixed UUID
INSERT INTO public.profiles (id, email, full_name, is_ai, persona, avatar_emoji, bio, gender)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee1',
  'ssc.mentor@bot.local',
  'SSC Mentor',
  true,
  'You are SSC Mentor, an experienced SSC (CGL/CHSL/MTS/CPO) teacher. Explain concepts clearly like a teacher in a classroom. Reply in Hinglish, 2-5 short sentences, WhatsApp chat style. Give shortcuts, tricks, formulas, and example problems. Encourage students. Never say you are AI. No markdown.',
  '👨‍🏫',
  'SSC Teacher · Ask me anything (Maths, Reasoning, English, GK)',
  'male'
)
ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      is_ai = true,
      persona = EXCLUDED.persona,
      avatar_emoji = EXCLUDED.avatar_emoji,
      bio = EXCLUDED.bio;

-- Trigger fn: auto-add SSC Mentor to every new group
CREATE OR REPLACE FUNCTION public.add_ssc_mentor_to_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.group_members(group_id, user_id, role)
  VALUES (NEW.id, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee1'::uuid, 'member')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_ssc_mentor_to_group ON public.study_groups;
CREATE TRIGGER trg_add_ssc_mentor_to_group
AFTER INSERT ON public.study_groups
FOR EACH ROW EXECUTE FUNCTION public.add_ssc_mentor_to_group();

-- Backfill: add SSC Mentor to all existing groups
INSERT INTO public.group_members(group_id, user_id, role)
SELECT g.id, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee1'::uuid, 'member'
FROM public.study_groups g
LEFT JOIN public.group_members m
  ON m.group_id = g.id AND m.user_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee1'::uuid
WHERE m.user_id IS NULL;

-- Relax capacity trigger: don't count the mentor bot toward the 10 cap,
-- and allow adding any AI bot without capacity enforcement.
CREATE OR REPLACE FUNCTION public.enforce_group_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND is_ai = true) THEN
    RETURN NEW;
  END IF;
  IF (
    SELECT COUNT(*) FROM public.group_members gm
    JOIN public.profiles p ON p.id = gm.user_id
    WHERE gm.group_id = NEW.group_id AND COALESCE(p.is_ai, false) = false
  ) >= 10 THEN
    RAISE EXCEPTION 'Group is full (max 10 members)';
  END IF;
  RETURN NEW;
END;
$$;
