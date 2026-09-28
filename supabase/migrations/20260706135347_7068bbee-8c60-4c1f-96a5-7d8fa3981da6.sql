
-- Study partner requests
CREATE TABLE public.partner_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_requests_no_self CHECK (requester_id <> addressee_id),
  CONSTRAINT partner_requests_unique_pair UNIQUE (requester_id, addressee_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_requests TO authenticated;
GRANT ALL ON public.partner_requests TO service_role;

ALTER TABLE public.partner_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own partner requests"
  ON public.partner_requests FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "users create partner requests"
  ON public.partner_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "addressee updates status"
  ON public.partner_requests FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id);

CREATE POLICY "either party deletes"
  ON public.partner_requests FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE TRIGGER partner_requests_updated_at
  BEFORE UPDATE ON public.partner_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Direct messages
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT direct_messages_no_self CHECK (sender_id <> receiver_id)
);

CREATE INDEX direct_messages_pair_idx
  ON public.direct_messages (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Helper: are two users accepted partners?
CREATE OR REPLACE FUNCTION public.are_partners(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_requests
    WHERE status = 'accepted'
      AND ((requester_id = _a AND addressee_id = _b)
        OR (requester_id = _b AND addressee_id = _a))
  );
$$;

CREATE POLICY "partners view messages"
  ON public.direct_messages FOR SELECT TO authenticated
  USING ((auth.uid() = sender_id OR auth.uid() = receiver_id)
    AND public.are_partners(sender_id, receiver_id));

CREATE POLICY "partners send messages"
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id
    AND public.are_partners(sender_id, receiver_id));

CREATE POLICY "receiver marks read"
  ON public.direct_messages FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Allow authenticated users to browse other profiles (for partner search)
DROP POLICY IF EXISTS "authenticated can view profiles" ON public.profiles;
CREATE POLICY "authenticated can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_requests;
