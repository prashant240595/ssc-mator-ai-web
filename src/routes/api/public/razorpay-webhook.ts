import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const signature = request.headers.get("x-razorpay-signature") ?? "";
        const { hmacSha256Hex, safeEqual, markPaidAndActivate } = await import(
          "@/lib/payments.server"
        );
        const secret = process.env["RAZORPAY_WEBHOOK_SECRET"];
        if (!secret) return new Response("not configured", { status: 503 });

        const expected = await hmacSha256Hex(secret, body);
        if (!signature || !safeEqual(expected, signature.toLowerCase())) {
          return new Response("invalid signature", { status: 401 });
        }

        let payload: any;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("bad payload", { status: 400 });
        }

        const event = payload?.event as string | undefined;
        if (event !== "payment.captured" && event !== "order.paid") {
          return new Response("ignored");
        }
        const payment = payload?.payload?.payment?.entity;
        const txnId: string | undefined =
          payment?.notes?.txnId ?? payload?.payload?.order?.entity?.notes?.txnId;
        if (!txnId) return new Response("no txn");

        await markPaidAndActivate({
          txnId,
          provider: "razorpay",
          paymentId: payment?.id ?? null,
          raw: payload,
        });
        return new Response("ok");
      },
    },
  },
});
