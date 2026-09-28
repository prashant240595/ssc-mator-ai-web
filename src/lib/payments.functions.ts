import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function originFromRequest(): string {
  try {
    const req = getRequest();
    const origin = req?.headers.get("origin");
    if (origin) return origin;
    if (req?.url) return new URL(req.url).origin;
  } catch {
    /* ignore */
  }
  return "https://sscmentorai.online";
}

/** Which payment providers are configured on the server, plus the available plans. */
export const getPaymentOptions = createServerFn({ method: "GET" }).handler(async () => {
  const { PLANS } = await import("@/lib/payments.server");
  return {
    razorpay: Boolean(process.env["RAZORPAY_KEY_ID"] && process.env["RAZORPAY_KEY_SECRET"]),
    phonepe: Boolean(process.env["PHONEPE_MERCHANT_ID"] && process.env["PHONEPE_SALT_KEY"]),
    plans: Object.values(PLANS),
  };
});

/** Current user's web-pass status. */
export const getMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("subscriptions")
      .select("expires_at, plan, provider")
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { active: Boolean(data), expiresAt: data?.expires_at ?? null };
  });

/** Start a payment with the chosen provider. */
export const startPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        provider: z.enum(["razorpay", "phonepe"]),
        plan: z.enum(["web_30d", "web_180d", "web_365d"]).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { planOf, newTxnId, razorpayCreateOrder, phonepeCreatePayment } = await import(
      "@/lib/payments.server"
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const plan = planOf(data.plan);
    const txnId = newTxnId();
    const origin = originFromRequest();

    if (data.provider === "razorpay") {
      const { orderId, keyId } = await razorpayCreateOrder(txnId, plan.amountPaise, plan.code);
      await supabaseAdmin.from("payment_orders").insert({
        user_id: context.userId,
        provider: "razorpay",
        provider_order_id: orderId,
        merchant_txn_id: txnId,
        amount_paise: plan.amountPaise,
        plan: plan.code,
      });
      return {
        provider: "razorpay" as const,
        txnId,
        orderId,
        keyId,
        amountPaise: plan.amountPaise,
      };
    }

    const { redirectUrl } = await phonepeCreatePayment({
      txnId,
      amountPaise: plan.amountPaise,
      userId: context.userId,
      origin,
    });
    await supabaseAdmin.from("payment_orders").insert({
      user_id: context.userId,
      provider: "phonepe",
      provider_order_id: txnId,
      merchant_txn_id: txnId,
      amount_paise: plan.amountPaise,
      plan: plan.code,
    });
    return { provider: "phonepe" as const, txnId, redirectUrl };
  });

/** Verify a Razorpay checkout result coming back from the browser. */
export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        txnId: z.string().min(4),
        orderId: z.string().min(4),
        paymentId: z.string().min(4),
        signature: z.string().min(8),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { razorpayVerifySignature, markPaidAndActivate } = await import(
      "@/lib/payments.server"
    );
    const ok = await razorpayVerifySignature(data.orderId, data.paymentId, data.signature);
    if (!ok) return { ok: false as const };
    const activated = await markPaidAndActivate({
      txnId: data.txnId,
      provider: "razorpay",
      paymentId: data.paymentId,
    });
    return { ok: activated };
  });

/** Poll PhonePe after the redirect back to the site. */
export const confirmPhonePePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ txnId: z.string().min(4) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("payment_orders")
      .select("user_id, status")
      .eq("merchant_txn_id", data.txnId)
      .maybeSingle();
    if (!order || order.user_id !== context.userId) return { ok: false as const };
    if (order.status === "paid") return { ok: true as const };

    const { phonepeCheckStatus, markPaidAndActivate } = await import("@/lib/payments.server");
    const paid = await phonepeCheckStatus(data.txnId);
    if (!paid) return { ok: false as const };
    return { ok: await markPaidAndActivate({ txnId: data.txnId, provider: "phonepe" }) };
  });
