
-- Study Groups
CREATE TABLE public.study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  subject text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_groups TO authenticated;
GRANT ALL ON public.study_groups TO service_role;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Security definer helpers (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_group_member(_gid uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _gid AND user_id = _uid);
$$;

CREATE OR REPLACE FUNCTION public.is_group_owner(_gid uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _gid AND user_id = _uid AND role = 'owner');
$$;

CREATE OR REPLACE FUNCTION public.group_member_count(_gid uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int FROM public.group_members WHERE group_id = _gid;
$$;

-- Enforce max 10 members
CREATE OR REPLACE FUNCTION public.enforce_group_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.group_members WHERE group_id = NEW.group_id) >= 10 THEN
    RAISE EXCEPTION 'Group is full (max 10 members)';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_group_capacity BEFORE INSERT ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_group_capacity();

-- Auto-add creator as owner
CREATE OR REPLACE FUNCTION public.add_group_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.group_members(group_id, user_id, role) VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_group_owner AFTER INSERT ON public.study_groups
  FOR EACH ROW EXECUTE FUNCTION public.add_group_owner();

-- Policies: study_groups
CREATE POLICY sg_select ON public.study_groups FOR SELECT TO authenticated
  USING (public.is_group_member(id, auth.uid()));
CREATE POLICY sg_insert ON public.study_groups FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY sg_update ON public.study_groups FOR UPDATE TO authenticated
  USING (public.is_group_owner(id, auth.uid()));
CREATE POLICY sg_delete ON public.study_groups FOR DELETE TO authenticated
  USING (public.is_group_owner(id, auth.uid()));

-- Policies: group_members
CREATE POLICY gm_select ON public.group_members FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY gm_insert_self ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_group_owner(group_id, auth.uid()));
CREATE POLICY gm_delete ON public.group_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_group_owner(group_id, auth.uid()));

-- Group messages
CREATE TABLE public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text,
  question_id uuid REFERENCES public.question_bank(id) ON DELETE SET NULL,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','question')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_messages TO authenticated;
GRANT ALL ON public.group_messages TO service_role;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY gmsg_select ON public.group_messages FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY gmsg_insert ON public.group_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_group_member(group_id, auth.uid()));
CREATE POLICY gmsg_delete ON public.group_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_group_owner(group_id, auth.uid()));

CREATE INDEX idx_gmsg_group_created ON public.group_messages(group_id, created_at);

-- Study sessions (personal timer log)
CREATE TABLE public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text,
  topic text,
  duration_seconds int NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ss_all ON public.study_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_ss_user_started ON public.study_sessions(user_id, started_at DESC);

-- Updated_at trigger for study_groups
CREATE TRIGGER trg_sg_updated BEFORE UPDATE ON public.study_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
