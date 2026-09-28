import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { z } from "zod";
import { confirmPhonePePayment } from "@/lib/payments.functions";

export const Route = createFileRoute("/payment-status")({
  validateSearch: z.object({ txn: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Payment status — SSC Mentor AI" },
      { name: "description", content: "Confirming your SSC Mentor AI web pass payment." },
      { property: "og:title", content: "Payment status — SSC Mentor AI" },
      { property: "og:description", content: "Confirming your web pass payment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentStatusPage,
});

function PaymentStatusPage() {
  const { txn } = Route.useSearch();
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "paid" | "failed">("checking");

  useEffect(() => {
    let cancelled = false;
    if (!txn) {
      setState("failed");
      return;
    }
    let tries = 0;
    const run = async () => {
      tries += 1;
      try {
        const res = await confirmPhonePePayment({ data: { txnId: txn } });
        if (cancelled) return;
        if (res.ok) return setState("paid");
      } catch {
        /* retry */
      }
      if (cancelled) return;
      if (tries >= 6) return setState("failed");
      setTimeout(run, 3000);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [txn]);

  return (
    <>
      <div className="grid min-h-[60vh] place-items-center px-2 py-8">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 text-center shadow-elevated">
          {state === "checking" && (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <h1 className="mt-4 text-lg font-bold">Confirming your payment…</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This usually takes a few seconds. Please do not close this page.
              </p>
            </>
          )}
          {state === "paid" && (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
              <h1 className="mt-4 text-lg font-bold">Payment successful</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your web pass is now active.
              </p>
              <button
                onClick={() => navigate({ to: "/" })}
                className="mt-5 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
              >
                Start studying
              </button>
            </>
          )}
          {state === "failed" && (
            <>
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <h1 className="mt-4 text-lg font-bold">Payment not confirmed</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                If money was deducted, your pass will activate automatically within a few minutes.
              </p>
              <button
                onClick={() => navigate({ to: "/pricing" })}
                className="mt-5 w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold"
              >
                Back to plans
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
