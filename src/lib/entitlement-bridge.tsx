import { useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { getAdFreeStatus, recordPlayPurchase } from "@/lib/billing.functions";

type AdsBridge = {
  /** Preferred: app hides AdMob ads while adFree is true. */
  setAdFree?: (adFree: boolean, expiresAt: string | null) => void;
  /** Fallback for older builds. */
  onEntitlement?: (json: string) => void;
};

type PlayPurchase = { productId: string; purchaseToken: string; orderId?: string };

const QUEUE_KEY = "ssc:pending-play-purchases";

function nativeBridge(): AdsBridge | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AndroidBilling?: AdsBridge; AndroidAds?: AdsBridge };
  return w.AndroidAds ?? w.AndroidBilling ?? null;
}

function readQueue(): PlayPurchase[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const arr = raw ? (JSON.parse(raw) as PlayPurchase[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeQueue(items: PlayPurchase[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-10)));
  } catch {
    /* storage unavailable */
  }
}

function queuePurchase(p: PlayPurchase) {
  const items = readQueue().filter((i) => i.purchaseToken !== p.purchaseToken);
  items.push(p);
  writeQueue(items);
}

/**
 * Single source of truth for "this user has paid".
 * Also the global Google Play purchase receiver: the Android app can call
 * window.onBillingPurchase({productId, purchaseToken, orderId}) from ANY page.
 * Failed/early reports are queued in localStorage and retried after sign-in.
 */
export function EntitlementBridge() {
  const { isAuthenticated, isGuest, user } = useAuth();
  const enabled = Boolean(isAuthenticated && !isGuest && user?.id);

  const q = useQuery({
    queryKey: ["entitlement", user?.id ?? "anon"],
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: () => getAdFreeStatus(),
  });

  const adFree = Boolean(q.data?.adFree);
  const expiresAt = q.data?.expiresAt ?? null;
  const refetch = q.refetch;

  /** Send one purchase to the server; queue it again on any failure. */
  const submit = useCallback(
    async (p: PlayPurchase, notify: boolean) => {
      if (!enabled) {
        queuePurchase(p);
        if (notify) toast.info("Please sign in — your purchase will activate automatically.");
        return false;
      }
      try {
        const res = await recordPlayPurchase({
          data: { productId: p.productId, purchaseToken: p.purchaseToken, orderId: p.orderId },
        });
        if (res.ok) {
          writeQueue(readQueue().filter((i) => i.purchaseToken !== p.purchaseToken));
          if (notify) toast.success("Ads removed — thank you!");
          await refetch();
          return true;
        }
        queuePurchase(p);
        if (notify) toast.error(res.error ?? "Purchase could not be saved. It will retry shortly.");
      } catch {
        queuePurchase(p);
        if (notify) toast.error("Network issue — your purchase will be activated automatically.");
      }
      return false;
    },
    [enabled, refetch],
  );

  // Register the global receiver as early as possible (any route).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      onBillingPurchase?: (p: PlayPurchase) => Promise<void>;
      sscBillingReady?: boolean;
    };
    w.onBillingPurchase = async (p) => {
      if (!p?.productId || !p?.purchaseToken) return;
      queuePurchase(p);
      await submit(p, true);
    };
    w.sscBillingReady = true;
    document.dispatchEvent(new CustomEvent("ssc:billing-ready"));
    return () => {
      w.sscBillingReady = false;
    };
  }, [submit]);

  // Retry anything queued (purchase reported before login / offline).
  useEffect(() => {
    if (!enabled) return;
    const pending = readQueue();
    if (pending.length === 0) return;
    void (async () => {
      for (const p of pending) await submit(p, false);
    })();
  }, [enabled, submit]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (enabled && q.isLoading) return;

    (window as unknown as { sscAdFree?: boolean }).sscAdFree = adFree;
    (window as unknown as { sscAdFreeUntil?: string | null }).sscAdFreeUntil = expiresAt;

    const b = nativeBridge();
    try {
      b?.setAdFree?.(adFree, expiresAt);
      b?.onEntitlement?.(JSON.stringify({ adFree, expiresAt }));
    } catch {
      /* older app build without the bridge */
    }

    document.dispatchEvent(
      new CustomEvent("ssc:entitlement", { detail: { adFree, expiresAt } }),
    );

    // Paid users must not see web ads either.
    if (adFree) {
      document.getElementById("adsense-loader")?.remove();
      document
        .querySelectorAll("ins.adsbygoogle")
        .forEach((el) => el.parentElement?.removeChild(el));
    }
  }, [adFree, expiresAt, enabled, q.isLoading]);

  return null;
}
