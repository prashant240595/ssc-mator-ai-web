import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/phonepe-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const header = request.headers.get("x-verify") ?? "";
        const { sha256Hex, safeEqual, phonepeCheckStatus, markPaidAndActivate } = await import(
          "@/lib/payments.server"
        );
        const saltKey = process.env["PHONEPE_SALT_KEY"];
        const saltIndex = process.env["PHONEPE_SALT_INDEX"] || "1";
        if (!saltKey) return new Response("not configured", { status: 503 });

        let parsed: any;
        try {
          parsed = JSON.parse(body);
        } catch {
          return new Response("bad payload", { status: 400 });
        }
        const base64: string | undefined = parsed?.response;
        if (!base64) return new Response("bad payload", { status: 400 });

        const expected = `${await sha256Hex(`${base64}${saltKey}`)}###${saltIndex}`;
        if (!safeEqual(expected, header)) {
          return new Response("invalid signature", { status: 401 });
        }

        let decoded: any;
        try {
          decoded = JSON.parse(atob(base64));
        } catch {
          return new Response("bad payload", { status: 400 });
        }
        const txnId: string | undefined = decoded?.data?.merchantTransactionId;
        if (!txnId) return new Response("no txn");

        // Re-confirm with PhonePe before granting access.
        if (!(await phonepeCheckStatus(txnId))) return new Response("not paid");
        await markPaidAndActivate({
          txnId,
          provider: "phonepe",
          paymentId: decoded?.data?.transactionId ?? null,
          raw: decoded,
        });
        return new Response("ok");
      },
    },
  },
});
