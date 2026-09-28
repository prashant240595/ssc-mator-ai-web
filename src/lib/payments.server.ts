/**
 * Server-only payment helpers for the web pass plans (1 month / 6 months / 1 year).
 * Providers: Razorpay (UPI + cards) and PhonePe PG (UPI first).
 */

export type PlanCode = "web_30d" | "web_180d" | "web_365d";

export const PLANS: Record<PlanCode, { code: PlanCode; label: string; amountPaise: number; days: number }> = {
  web_30d: { code: "web_30d", label: "1 month", amountPaise: 3000, days: 30 },
  web_180d: { code: "web_180d", label: "6 months", amountPaise: 16000, days: 180 },
  web_365d: { code: "web_365d", label: "1 year", amountPaise: 30000, days: 365 },
};

export const DEFAULT_PLAN: PlanCode = "web_30d";

export function planOf(code: string | null | undefined) {
  return PLANS[(code ?? DEFAULT_PLAN) as PlanCode] ?? PLANS[DEFAULT_PLAN];
}

/** @deprecated kept for compatibility */
export const PLAN_CODE = DEFAULT_PLAN;
export const PLAN_AMOUNT_PAISE = PLANS.web_30d.amountPaise;
export const PLAN_DAYS = PLANS.web_30d.days;

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

export async function sha256Hex(message: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(message)));
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

export function optionalEnv(name: string): string | null {
  return process.env[name] || null;
}

export function newTxnId(): string {
  return `SSC${Date.now()}${Math.floor(Math.random() * 1e5)
    .toString()
    .padStart(5, "0")}`;
}

/* ------------------------------- Razorpay ------------------------------- */

export async function razorpayCreateOrder(txnId: string, amountPaise: number, planCode: string = PLAN_CODE) {
  const keyId = env("RAZORPAY_KEY_ID");
  const keySecret = env("RAZORPAY_KEY_SECRET");
  const auth = btoa(`${keyId}:${keySecret}`);
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Basic ${auth}` },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt: txnId,
      notes: { plan: planCode, txnId },
    }),
  });
  const json = (await res.json()) as { id?: string; error?: { description?: string } };
  if (!res.ok || !json.id) {
    throw new Error(json.error?.description || "Razorpay order could not be created");
  }
  return { orderId: json.id, keyId };
}

export async function razorpayVerifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
): Promise<boolean> {
  const expected = await hmacSha256Hex(env("RAZORPAY_KEY_SECRET"), `${orderId}|${paymentId}`);
  return safeEqual(expected, signature.toLowerCase());
}

/* -------------------------------- PhonePe -------------------------------- */

const PHONEPE_HOST_LIVE = "https://api.phonepe.com/apis/hermes";
const PHONEPE_HOST_TEST = "https://api-preprod.phonepe.com/apis/pg-sandbox";

function phonepeHost(): string {
  const mid = env("PHONEPE_MERCHANT_ID");
  return mid.toUpperCase().includes("UAT") || mid.toUpperCase().includes("TEST")
    ? PHONEPE_HOST_TEST
    : PHONEPE_HOST_LIVE;
}

export async function phonepeCreatePayment(opts: {
  txnId: string;
  amountPaise: number;
  userId: string;
  origin: string;
}) {
  const merchantId = env("PHONEPE_MERCHANT_ID");
  const saltKey = env("PHONEPE_SALT_KEY");
  const saltIndex = optionalEnv("PHONEPE_SALT_INDEX") ?? "1";

  const payload = {
    merchantId,
    merchantTransactionId: opts.txnId,
    merchantUserId: opts.userId.replace(/-/g, "").slice(0, 32),
    amount: opts.amountPaise,
    redirectUrl: `${opts.origin}/payment-status?txn=${opts.txnId}`,
    redirectMode: "REDIRECT",
    callbackUrl: `${opts.origin}/api/public/phonepe-callback`,
    paymentInstrument: { type: "PAY_PAGE" },
  };
  const base64 = btoa(JSON.stringify(payload));
  const checksum = `${await sha256Hex(`${base64}/pg/v1/pay${saltKey}`)}###${saltIndex}`;

  const res = await fetch(`${phonepeHost()}/pg/v1/pay`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "X-VERIFY": checksum,
    },
    body: JSON.stringify({ request: base64 }),
  });
  const json = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: { instrumentResponse?: { redirectInfo?: { url?: string } } };
  };
  const url = json.data?.instrumentResponse?.redirectInfo?.url;
  if (!json.success || !url) throw new Error(json.message || "PhonePe payment could not be started");
  return { redirectUrl: url };
}

export async function phonepeCheckStatus(txnId: string): Promise<boolean> {
  const merchantId = env("PHONEPE_MERCHANT_ID");
  const saltKey = env("PHONEPE_SALT_KEY");
  const saltIndex = optionalEnv("PHONEPE_SALT_INDEX") ?? "1";
  const path = `/pg/v1/status/${merchantId}/${txnId}`;
  const checksum = `${await sha256Hex(`${path}${saltKey}`)}###${saltIndex}`;
  const res = await fetch(`${phonepeHost()}${path}`, {
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "X-VERIFY": checksum,
      "X-MERCHANT-ID": merchantId,
    },
  });
  const json = (await res.json()) as { success?: boolean; code?: string };
  return Boolean(json.success) && json.code === "PAYMENT_SUCCESS";
}

/* ------------------------- Subscription activation ------------------------ */

export async function markPaidAndActivate(opts: {
  txnId: string;
  provider: "razorpay" | "phonepe";
  paymentId?: string | null;
  raw?: unknown;
}): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: order } = await supabaseAdmin
    .from("payment_orders")
    .select("id, user_id, status, plan")
    .eq("merchant_txn_id", opts.txnId)
    .maybeSingle();
  if (!order) return false;
  if (order.status === "paid") return true;

  await supabaseAdmin
    .from("payment_orders")
    .update({
      status: "paid",
      provider_payment_id: opts.paymentId ?? null,
      raw: (opts.raw ?? null) as never,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  // Extend from the current expiry when the user already has an active pass.
  const nowIso = new Date().toISOString();
  const { data: current } = await supabaseAdmin
    .from("subscriptions")
    .select("expires_at")
    .eq("user_id", order.user_id)
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const start = current ? new Date(current.expires_at) : new Date();
  const days = planOf(order.plan).days;
  const expires = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);

  await supabaseAdmin.from("subscriptions").insert({
    user_id: order.user_id,
    plan: order.plan,
    provider: opts.provider,
    order_id: order.id,
    starts_at: start.toISOString(),
    expires_at: expires.toISOString(),
  });
  return true;
}
