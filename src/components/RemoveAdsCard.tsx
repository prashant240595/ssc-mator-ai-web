import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Loader2, ShieldOff, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useIsAppUser } from "@/lib/app-user";
import { useAuth } from "@/lib/auth";
import { getAdFreeStatus } from "@/lib/billing.functions";

type PlanId = "adfree_1m" | "adfree_6m" | "adfree_12m";

const PLANS: { id: PlanId; label: string; price: string; sub?: string }[] = [
  { id: "adfree_1m", label: "1 month", price: "₹30" },
  { id: "adfree_6m", label: "6 months", price: "₹180", sub: "Save ₹0 · popular" },
  { id: "adfree_12m", label: "1 year", price: "₹280", sub: "Best value" },
];

/** Native bridge exposed by the Android app's WebView. */
type BillingBridge = {
  purchase: (productId: string) => void;
  isAvailable?: () => boolean;
};

function bridge(): BillingBridge | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { AndroidBilling?: BillingBridge }).AndroidBilling ?? null;
}

/**
 * Remove Ads (app only).
 * Tapping a plan calls the native Google Play Billing bridge:
 *   window.AndroidBilling.purchase("adfree_1m")
 * The app then reports back with:
 *   window.onBillingPurchase({ productId, purchaseToken, orderId })
 */
export function RemoveAdsCard({ compact = false }: { compact?: boolean }) {
  const isApp = useIsAppUser();
  const { isAuthenticated, isGuest, user } = useAuth();
  const enabled = Boolean(isApp && isAuthenticated && !isGuest && user?.id);
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [open, setOpen] = useState(false);

  const status = useQuery({
    queryKey: ["ad-free", user?.id ?? "anon"],
    enabled,
    staleTime: 60_000,
    queryFn: () => getAdFreeStatus(),
  });

  // The global bridge (EntitlementBridge) receives window.onBillingPurchase.
  // Here we only refresh the card when entitlement changes.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onChange = () => {
      setBusy(null);
      void status.refetch();
    };
    document.addEventListener("ssc:entitlement", onChange);
    return () => document.removeEventListener("ssc:entitlement", onChange);
  }, [status]);


  if (!isApp) return null;

  const adFree = Boolean(status.data?.adFree);

  function buy(id: PlanId) {
    const b = bridge();
    if (!b?.purchase) {
      toast.error("Please update the app to the latest version to remove ads.");
      return;
    }
    setBusy(id);
    try {
      b.purchase(id);
    } catch {
      setBusy(null);
      toast.error("Could not open Google Play billing.");
    }
    // Safety: clear the spinner if the app never calls back.
    setTimeout(() => setBusy(null), 60_000);
  }

  if (adFree) {
    return (
      <div className="card-surface flex items-center gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success-soft text-success">
          <BadgeCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Ad-free active</p>
          <p className="truncate text-xs text-muted-foreground">
            Until{" "}
            {status.data?.expiresAt
              ? new Date(status.data.expiresAt).toLocaleDateString()
              : "—"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning-foreground">
          <ShieldOff className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Remove ads</p>
          <p className="truncate text-xs text-muted-foreground">
            {compact ? "From ₹30 · no ads, faster study" : "Study without any ads — from ₹30"}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary">
          <Sparkles className="h-3 w-3" />
          {open ? "Close" : "View plans"}
        </span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-border p-4">
          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={busy !== null || !enabled}
              onClick={() => buy(p.id)}
              className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left transition hover:bg-muted disabled:opacity-60"
            >
              <span>
                <span className="block text-sm font-semibold">{p.label}</span>
                {p.sub && (
                  <span className="block text-xs text-muted-foreground">{p.sub}</span>
                )}
              </span>
              <span className="flex items-center gap-2 text-lg font-extrabold">
                {busy === p.id && <Loader2 className="h-4 w-4 animate-spin" />}
                {p.price}
              </span>
            </button>
          ))}
          {!enabled && (
            <p className="text-xs text-muted-foreground">Sign in to purchase ad-free access.</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Secure payment through Google Play. Cancel anytime from the Play Store.
          </p>
        </div>
      )}
    </div>
  );
}
