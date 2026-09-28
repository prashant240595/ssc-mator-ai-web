CREATE TABLE public.payment_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('razorpay','phonepe')),
  provider_order_id TEXT NOT NULL,
  merchant_txn_id TEXT NOT NULL UNIQUE,
  amount_paise INTEGER NOT NULL,
  plan TEXT NOT NULL DEFAULT 'web_30d',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','paid','failed')),
  provider_payment_id TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payment_orders_user_idx ON public.payment_orders(user_id, created_at DESC);
CREATE INDEX payment_orders_provider_order_idx ON public.payment_orders(provider, provider_order_id);

GRANT SELECT ON public.payment_orders TO authenticated;
GRANT ALL ON public.payment_orders TO service_role;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payment orders" ON public.payment_orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'web_30d',
  provider TEXT NOT NULL,
  order_id UUID REFERENCES public.payment_orders(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX subscriptions_user_idx ON public.subscriptions(user_id, expires_at DESC);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);