CREATE TABLE public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  user_name text,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX account_deletion_requests_pending_uniq
  ON public.account_deletion_requests(user_id)
  WHERE status = 'pending';

GRANT SELECT, INSERT ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deletion requests"
  ON public.account_deletion_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deletion request"
  ON public.account_deletion_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER account_deletion_requests_updated_at
  BEFORE UPDATE ON public.account_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();