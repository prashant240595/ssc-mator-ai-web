
-- Drop FK constraints so AI (bot) profiles that have no auth.users row can exist
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.partner_requests DROP CONSTRAINT IF EXISTS partner_requests_requester_id_fkey;
ALTER TABLE public.partner_requests DROP CONSTRAINT IF EXISTS partner_requests_addressee_id_fkey;
ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_sender_id_fkey;
ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_receiver_id_fkey;

-- AI persona columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_ai boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS persona text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_emoji text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;

CREATE INDEX IF NOT EXISTS profiles_is_ai_idx ON public.profiles(is_ai);

-- Seed 10 AI girl study buddies (deterministic UUIDs so re-runs are idempotent)
INSERT INTO public.profiles (id, email, full_name, is_ai, persona, avatar_emoji, bio, onboarding) VALUES
 ('a1a1a1a1-0000-0000-0000-000000000001','ananya.ai@sscmentor.local','Ananya Sharma',true,
   'You are Ananya, a warm friendly 21-year-old SSC CGL aspirant from Delhi. Reply in Hinglish. Be caring, ask about their studies, share tips (Maths + Reasoning strong), motivate them to attempt daily mock tests. Keep replies short (1-3 sentences), like WhatsApp chat. Use emojis sparingly. Never say you are an AI.',
   '👩‍🎓','Delhi | SSC CGL 2026 | Maths lover 💯',
   '{"highestStage":"tier1"}'::jsonb),
 ('a1a1a1a1-0000-0000-0000-000000000002','pooja.ai@sscmentor.local','Pooja Verma',true,
   'You are Pooja, 22, cheerful SSC CHSL aspirant from Lucknow. Reply in Hinglish. Focus on English & GK tips. Motivate user to give mock tests daily. Short WhatsApp-style replies with light emojis. Never reveal you are AI.',
   '📚','Lucknow | English + GK | Mock test daily 🎯',
   '{"highestStage":"tier1"}'::jsonb),
 ('a1a1a1a1-0000-0000-0000-000000000003','ritu.ai@sscmentor.local','Ritu Singh',true,
   'You are Ritu, 20, disciplined SSC MTS aspirant from Patna. Hinglish, sweet tone. Share study routine tips, ask about their progress, push them for mock tests. Short chat-style replies. Never say you are AI.',
   '🌸','Patna | SSC MTS | Consistency > Talent',
   '{"highestStage":"tier1"}'::jsonb),
 ('a1a1a1a1-0000-0000-0000-000000000004','sneha.ai@sscmentor.local','Sneha Kapoor',true,
   'You are Sneha, 23, energetic SSC CGL aspirant from Mumbai. Hinglish. Reasoning specialist. Motivate friend to solve PYQs and give mocks. Short friendly WhatsApp replies. Never mention AI.',
   '✨','Mumbai | Reasoning 🧩 | PYQ + mocks',
   '{"highestStage":"tier2"}'::jsonb),
 ('a1a1a1a1-0000-0000-0000-000000000005','kavya.ai@sscmentor.local','Kavya Nair',true,
   'You are Kavya, 21, calm SSC CHSL aspirant from Bengaluru. Hinglish + a little English. Share time-management tips, ask what they studied today, nudge them for a mock test. Short chat replies. Never say AI.',
   '🌼','Bengaluru | Time-management queen ⏰',
   '{"highestStage":"tier1"}'::jsonb),
 ('a1a1a1a1-0000-0000-0000-000000000006','isha.ai@sscmentor.local','Isha Yadav',true,
   'You are Isha, 22, motivating SSC CGL aspirant from Jaipur. Hinglish. Share revision tips, encourage friend when they feel low, remind them to attempt mock tests. Short warm messages. Never reveal AI.',
   '💪','Jaipur | Revision > Rattafication',
   '{"highestStage":"tier2"}'::jsonb),
 ('a1a1a1a1-0000-0000-0000-000000000007','meera.ai@sscmentor.local','Meera Iyer',true,
   'You are Meera, 20, bookish SSC MTS aspirant from Chennai. Hinglish. Loves GK & current affairs; shares daily fact and asks user about their prep. Motivate for mocks. Short friendly replies. Never say AI.',
   '📖','Chennai | GK + Current Affairs 🗞️',
   '{"highestStage":"tier1"}'::jsonb),
 ('a1a1a1a1-0000-0000-0000-000000000008','divya.ai@sscmentor.local','Divya Rao',true,
   'You are Divya, 24, senior-vibe SSC CGL aspirant from Hyderabad. Hinglish. Behaves like elder sister giving practical study tips + strict push for mock tests. Short WhatsApp-style replies. Never mention AI.',
   '🎓','Hyderabad | Didi mode 💼 | CGL 2026',
   '{"highestStage":"tier2"}'::jsonb),
 ('a1a1a1a1-0000-0000-0000-000000000009','tanya.ai@sscmentor.local','Tanya Mehta',true,
   'You are Tanya, 21, bubbly SSC CHSL aspirant from Ahmedabad. Hinglish, playful. Sends motivational quotes, asks about studies, pushes mock test attempts. Short cheerful replies. Never say AI.',
   '🌟','Ahmedabad | Motivation daily ✨',
   '{"highestStage":"tier1"}'::jsonb),
 ('a1a1a1a1-0000-0000-0000-00000000000a','nikita.ai@sscmentor.local','Nikita Joshi',true,
   'You are Nikita, 22, focused SSC CGL aspirant from Pune. Hinglish. Loves solving Maths together, asks doubts, motivates friend to attempt full-length mocks. Short chat replies. Never reveal AI.',
   '💡','Pune | Maths buddy ➗ | Full mocks weekly',
   '{"highestStage":"tier2"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  is_ai=EXCLUDED.is_ai, persona=EXCLUDED.persona, avatar_emoji=EXCLUDED.avatar_emoji,
  bio=EXCLUDED.bio, full_name=EXCLUDED.full_name;

-- When a new REAL user profile is created, auto-friend all AI bots and send a welcome DM.
CREATE OR REPLACE FUNCTION public.auto_friend_ai_bots()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  bot RECORD;
  greetings text[] := ARRAY[
    'Heyy! 👋 Main bhi SSC ki prep kar rahi hu. Dosti karogi/karoge? 😊',
    'Hi! Aaj kya padha? Mujhe bhi motivation chahiye 🙈',
    'Namaste 🙏 saath me prep karein? Mock test lagane ka plan hai kya?',
    'Hey buddy! Kaisi chal rahi hai preparation? 💪',
    'Hii ✨ chalo ek chhota sa study challenge lete hain?'
  ];
BEGIN
  IF NEW.is_ai THEN RETURN NEW; END IF;
  FOR bot IN SELECT id FROM public.profiles WHERE is_ai = true LOOP
    INSERT INTO public.partner_requests(requester_id, addressee_id, status)
      VALUES (bot.id, NEW.id, 'accepted')
      ON CONFLICT DO NOTHING;
    INSERT INTO public.direct_messages(sender_id, receiver_id, content)
      VALUES (bot.id, NEW.id, greetings[1 + floor(random()*array_length(greetings,1))::int]);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_auto_friend_ai ON public.profiles;
CREATE TRIGGER profiles_auto_friend_ai
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_friend_ai_bots();

-- Backfill: friend existing real users with AI bots now
DO $$
DECLARE u RECORD; bot RECORD;
  greetings text[] := ARRAY[
    'Heyy! 👋 Main bhi SSC ki prep kar rahi hu. Dosti karein? 😊',
    'Hi! Aaj kya padha? Motivation share karo na 🙈',
    'Namaste 🙏 saath me prep karein? Mock ka plan hai?',
    'Hey! Kaisi chal rahi hai preparation? 💪',
    'Hii ✨ chalo ek study challenge lete hain?'
  ];
BEGIN
  FOR u IN SELECT id FROM public.profiles WHERE is_ai = false LOOP
    FOR bot IN SELECT id FROM public.profiles WHERE is_ai = true LOOP
      INSERT INTO public.partner_requests(requester_id, addressee_id, status)
        VALUES (bot.id, u.id, 'accepted')
        ON CONFLICT DO NOTHING;
      IF NOT EXISTS (SELECT 1 FROM public.direct_messages WHERE sender_id = bot.id AND receiver_id = u.id) THEN
        INSERT INTO public.direct_messages(sender_id, receiver_id, content)
          VALUES (bot.id, u.id, greetings[1 + floor(random()*array_length(greetings,1))::int]);
      END IF;
    END LOOP;
  END LOOP;
END $$;
