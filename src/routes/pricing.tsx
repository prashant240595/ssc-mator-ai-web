import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Download, Loader2, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { PLAY_STORE_URL } from "@/components/WebPaywall";
import { getPaymentOptions, startPayment, verifyRazorpayPayment } from "@/lib/payments.functions";
import { useSubscription } from "@/lib/use-subscription";
import { useAuth } from "@/lib/auth";
import { FREE_ACCESS_FOR_ALL } from "@/lib/access";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: FREE_ACCESS_FOR_ALL
      ? [
          { title: "Free Access — SSC Mentor AI" },
          {
            name: "description",
            content:
              "Every SSC Mentor AI feature is free on the website right now: practice, previous year papers, mock tests, AI Coach, Daily Quiz and Smart Revision. No payment needed.",
          },
          { property: "og:title", content: "SSC Mentor AI — free access for everyone" },
          {
            property: "og:description",
            content: "All features are free on the website right now. No payment needed.",
          },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary_large_image" },
        ]
      : [
          { title: "Pricing — SSC Mentor AI Web Pass (from ₹30)" },
          {
            name: "description",
            content:
              "Unlock full website access to SSC Mentor AI: ₹30 for 1 month, ₹160 for 6 months or ₹300 for 1 year. Pay by UPI, or install the Android app and use everything free.",
          },
          { property: "og:title", content: "SSC Mentor AI Web Pass — ₹30 / month, ₹300 / year" },
          {
            property: "og:description",
            content: "UPI payment via Razorpay. The Android app stays completely free.",
          },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary_large_image" },
        ],
  }),
  component: PricingPage,
});

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const PERKS = [
  "Unlimited practice, PYQs and mock tests on the website",
  "AI Coach, Daily Quiz and Smart Revision",
  "Study partners, groups, chat and timer",
  "Full progress analytics and bookmarks",
];

type PlanCode = "web_30d" | "web_180d" | "web_365d";

const PLAN_UI: { code: PlanCode; label: string; price: string; sub: string; badge?: string }[] = [
  { code: "web_30d", label: "1 month", price: "₹30", sub: "30 days access" },
  {
    code: "web_180d",
    label: "6 months",
    price: "₹160",
    sub: "180 days · save ₹20",
    badge: "Popular",
  },
  { code: "web_365d", label: "1 year", price: "₹300", sub: "365 days · best value" },
];

function PricingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isGuest } = useAuth();
  const { active, expiresAt, refetch } = useSubscription();
  const [options, setOptions] = useState<{ razorpay: boolean; phonepe: boolean } | null>(null);
  const [busy, setBusy] = useState<"razorpay" | "phonepe" | null>(null);
  const [plan, setPlan] = useState<PlanCode>("web_180d");

  const start = useServerFn(startPayment);
  const verify = useServerFn(verifyRazorpayPayment);

  useEffect(() => {
    if (FREE_ACCESS_FOR_ALL) return;
    getPaymentOptions()
      .then((o) => setOptions({ razorpay: o.razorpay, phonepe: o.phonepe }))
      .catch(() => setOptions({ razorpay: false, phonepe: false }));
  }, []);

  // Free access: there is nothing to sell, so skip the checkout entirely.
  // Every hook above has already run, so this early return is safe.
  if (FREE_ACCESS_FOR_ALL) return <FreeAccessPage />;

  const selected = PLAN_UI.find((p) => p.code === plan)!;

  async function pay(provider: "razorpay" | "phonepe") {
    if (!isAuthenticated || isGuest) {
      toast.error("Please sign in to buy the web pass.");
      navigate({ to: "/login" });
      return;
    }
    setBusy(provider);
    try {
      const res = await start({ data: { provider, plan } });
      if (res.provider === "phonepe") {
        window.location.href = res.redirectUrl;
        return;
      }
      const ok = await loadRazorpayScript();
      if (!ok || !window.Razorpay) throw new Error("Could not load the payment window");
      const rzp = new window.Razorpay({
        key: res.keyId,
        order_id: res.orderId,
        amount: res.amountPaise,
        currency: "INR",
        name: "SSC Mentor AI",
        description: `Web pass — ${selected.label}`,
        theme: { color: "#2563eb" },
        handler: async (r: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const v = await verify({
            data: {
              txnId: res.txnId,
              orderId: r.razorpay_order_id,
              paymentId: r.razorpay_payment_id,
              signature: r.razorpay_signature,
            },
          });
          if (v.ok) {
            toast.success(`Payment successful — your ${selected.label} web pass is active.`);
            await refetch();
            navigate({ to: "/" });
          } else {
            toast.error("We could not confirm the payment. It will update shortly.");
          }
        },
        modal: { ondismiss: () => setBusy(null) },
      });
      rzp.open();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment could not be started");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-3xl py-6">
        <h1 className="text-2xl font-bold">Website access plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Using SSC Mentor AI on a website or mobile browser is paid. The Android app is
          completely free.
        </p>

        {active && (
          <div className="mt-5 rounded-2xl border border-success/40 bg-success-soft px-4 py-3 text-sm font-medium">
            <ShieldCheck className="mr-2 inline h-4 w-4" />
            Your web pass is active until{" "}
            {expiresAt ? new Date(expiresAt).toLocaleDateString() : "—"}.
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-primary/40 bg-card p-6 shadow-elevated">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Web pass
            </span>
            <p className="mt-3 text-4xl font-extrabold">
              {selected.price}
              <span className="ml-1 text-base font-medium text-muted-foreground">
                / {selected.label}
              </span>
            </p>

            <div className="mt-4 space-y-2">
              {PLAN_UI.map((p) => {
                const isOn = p.code === plan;
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setPlan(p.code)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      isOn
                        ? "border-primary bg-primary-soft"
                        : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    <span>
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        {p.label}
                        {p.badge && (
                          <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                            {p.badge}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{p.sub}</span>
                    </span>
                    <span className="text-lg font-extrabold">{p.price}</span>
                  </button>
                );
              })}
            </div>

            <ul className="mt-4 space-y-2 text-sm">
              {PERKS.map((p) => (
                <li key={p} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span className="text-muted-foreground">{p}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 space-y-2">
              <button
                disabled={busy !== null || options?.razorpay === false}
                onClick={() => pay("razorpay")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-elevated transition hover:opacity-95 disabled:opacity-50"
              >
                {busy === "razorpay" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-base">₹</span>
                )}
                Pay with UPI (Razorpay)
              </button>
              {options && !options.razorpay && (
                <p className="text-xs text-destructive">
                  Payments are not configured yet. Please try again later.
                </p>
              )}
              <p className="text-center text-[11px] text-muted-foreground">
                UPI, cards and netbanking supported. Secure checkout.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
              <Smartphone className="h-3.5 w-3.5" /> Android app
            </span>
            <p className="mt-3 text-4xl font-extrabold">
              Free<span className="ml-1 text-base font-medium text-muted-foreground">/ forever</span>
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Install the app and every feature unlocks automatically — no payment, no limits.
            </p>
            <button
              onClick={() => window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer")}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-success px-4 py-3 text-sm font-semibold text-success-foreground transition hover:opacity-95"
            >
              <Download className="h-4 w-4" />
              Install the free app
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** Shown while `FREE_ACCESS_FOR_ALL` is on — no prices, no checkout. */
function FreeAccessPage() {
  return (
    <div className="mx-auto max-w-3xl py-6">
      <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
        <Sparkles className="h-3.5 w-3.5" /> Free for everyone
      </span>
      <h1 className="mt-3 text-2xl font-bold">Everything is free right now</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        No payment and no trial limit. Sign in and every feature below is open to you on the
        website.
      </p>

      <ul className="mt-5 space-y-2 text-sm">
        {PERKS.map((p) => (
          <li key={p} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span className="text-muted-foreground">{p}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link
          to="/practice"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-elevated transition hover:opacity-95"
        >
          Start practising
        </Link>
        <button
          onClick={() => window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer")}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Get the Android app
        </button>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Payments are switched off while free access is on. Nothing is charged, and any pass bought
        earlier stays valid for its full period.
      </p>
    </div>
  );
}
