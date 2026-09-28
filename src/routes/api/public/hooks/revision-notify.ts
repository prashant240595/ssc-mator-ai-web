/**
 * Cron endpoint: called daily at 8 AM IST by pg_cron.
 * Sends a push notification to every user who has revision topics due today.
 * Auth: `apikey` header must equal SUPABASE_PUBLISHABLE_KEY.
 */
import { createFileRoute } from "@tanstack/react-router";
import { sendPushToUsers } from "@/lib/fcm.server";

export const Route = createFileRoute("/api/public/hooks/revision-notify")({
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
          const today = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);

          const { data: rows } = await supabaseAdmin
            .from("revision_topics")
            .select("user_id, title")
            .eq("status", "active")
            .lte("next_review_date", today)
            .limit(5000);

          const byUser = new Map<string, string[]>();
          for (const r of rows ?? []) {
            const list = byUser.get(r.user_id as string) ?? [];
            list.push(r.title as string);
            byUser.set(r.user_id as string, list);
          }

          let sent = 0;
          const entries = Array.from(byUser.entries());
          for (let i = 0; i < entries.length; i += 50) {
            const batch = entries.slice(i, i + 50);
            await Promise.all(
              batch.map(([userId, titles]) =>
                sendPushToUsers([userId], {
                  title: `🧠 ${titles.length} topic${titles.length > 1 ? "s" : ""} to revise today`,
                  body:
                    titles.slice(0, 2).join(", ") +
                    (titles.length > 2 ? ` +${titles.length - 2} more` : "") +
                    " — 10 minutes and it's locked in memory.",
                  url: "/revision",
                  tag: "revision-due",
                }).catch(() => null),
              ),
            );
            sent += batch.length;
          }

          return Response.json({ ok: true, notified: sent });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "unknown";
          console.error("[revision-notify]", msg);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
