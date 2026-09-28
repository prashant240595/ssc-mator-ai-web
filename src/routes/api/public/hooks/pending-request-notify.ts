/**
 * Cron endpoint: daily push to users who have a pending incoming friend/partner
 * request they haven't accepted yet (includes AI buddy requests).
 * Auth: `apikey` header must equal SUPABASE_PUBLISHABLE_KEY.
 */
import { createFileRoute } from "@tanstack/react-router";
import { sendPushToUsers } from "@/lib/fcm.server";

export const Route = createFileRoute("/api/public/hooks/pending-request-notify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const provided = request.headers.get("apikey");
        if (!expected || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: pending } = await supabaseAdmin
            .from("partner_requests")
            .select("addressee_id, requester_id")
            .eq("status", "pending")
            .limit(5000);

          if (!pending || pending.length === 0) {
            return Response.json({ ok: true, notified: 0 });
          }

          // Count pending per addressee
          const perUser = new Map<string, number>();
          for (const r of pending) {
            const uid = r.addressee_id as string;
            perUser.set(uid, (perUser.get(uid) ?? 0) + 1);
          }

          // Skip AI recipients
          const { data: ai } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("is_ai", true);
          const aiSet = new Set((ai ?? []).map((r) => r.id as string));

          const targets = [...perUser.keys()].filter((u) => !aiSet.has(u));
          if (targets.length === 0) return Response.json({ ok: true, notified: 0 });

          let sent = 0;
          for (let i = 0; i < targets.length; i += 50) {
            const batch = targets.slice(i, i + 50);
            await Promise.all(
              batch.map((uid) => {
                const n = perUser.get(uid) ?? 1;
                return sendPushToUsers([uid], {
                  title: n > 1 ? `${n} friend requests waiting 🤝` : "New friend request waiting 🤝",
                  body: "Ek study buddy aapka wait kar raha hai — accept karke chat start karo!",
                  url: "/partners",
                  tag: "pending-request",
                }).catch(() => null);
              }),
            );
            sent += batch.length;
          }

          return Response.json({ ok: true, notified: sent });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "unknown";
          console.error("[pending-request-notify]", msg);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
