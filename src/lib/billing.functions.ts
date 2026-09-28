import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Google Play in-app product / subscription IDs and the access they grant. */
export const AD_FREE_PRODUCTS = {
  adfree_1m: { days: 30, label: "1 month", price: "₹30" },
  adfree_6m: { days: 180, label: "6 months", price: "₹180" },
  adfree_12m: { days: 365, label: "1 year", price: "₹280" },
} as const;

export type AdFreeProductId = keyof typeof AD_FREE_PRODUCTS;

/** Play console IDs can differ slightly (dots, dashes, prefixes) — normalise them. */
function resolveProduct(raw: string): AdFreeProductId | null {
  const id = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (id.includes("12m") || id.includes("1y") || id.includes("year") || id.includes("365"))
    return "adfree_12m";
  if (id.includes("6m") || id.includes("180") || id.includes("halfyear")) return "adfree_6m";
  if (id.includes("1m") || id.includes("30") || id.includes("month")) return "adfree_1m";
  return null;
}

/**
 * Is the signed-in user ad-free right now?
 * Any paid pass counts — Google Play (in-app) OR a website payment
 * (Razorpay / PhonePe). One purchase unlocks both surfaces.
 */
export const getAdFreeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("subscriptions")
      .select("expires_at, plan, provider")
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return {
      adFree: Boolean(data),
      expiresAt: data?.expires_at ?? null,
      provider: data?.provider ?? null,
    };
  });

/**
 * Called by the web layer after the Android app reports a successful Play purchase.
 * The app passes the purchaseToken so it can be reconciled later.
 */
export const recordPlayPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        productId: z.string().min(2),
        purchaseToken: z.string().min(4),
        orderId: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const product = resolveProduct(data.productId);
    if (!product) {
      return { ok: false as const, error: `Unknown product: ${data.productId}` };
    }
    const days = AD_FREE_PRODUCTS[product].days;
    const planTag = `${product}:${data.purchaseToken.slice(0, 24)}`;

    // Same purchase reported twice (app retry / restore) — treat as success.
    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("expires_at")
      .eq("user_id", context.userId)
      .eq("plan", planTag)
      .maybeSingle();
    if (existing) return { ok: true as const, expiresAt: existing.expires_at };

    // Extend from the current expiry when a pass is still active (any provider).
    const { data: current } = await supabaseAdmin
      .from("subscriptions")
      .select("expires_at")
      .eq("user_id", context.userId)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const base = current?.expires_at ? new Date(current.expires_at) : new Date();
    const expiresAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabaseAdmin.from("subscriptions").insert({
      user_id: context.userId,
      provider: "google_play",
      plan: planTag,
      starts_at: new Date().toISOString(),
      expires_at: expiresAt,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, expiresAt };
  });
