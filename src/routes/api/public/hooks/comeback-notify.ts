/**
 * Cron endpoint: called daily at 7 PM IST by pg_cron.
 * Sends push notifications to users who haven't attempted anything today
 * to keep their streak alive.
 * Auth: `apikey` header must equal SUPABASE_PUBLISHABLE_KEY.
 */
import { createFileRoute } from "@tanstack/react-router";
import { sendPushToUsers } from "@/lib/fcm.server";

export const Route = createFileRoute("/api/public/hooks/comeback-notify")({
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
          const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
          const today = istNow.toISOString().slice(0, 10);

          // Users with an active streak whose last activity is NOT today
          const { data: atRisk } = await supabaseAdmin
            .from("user_streaks")
            .select("user_id, current_streak, last_activity_date")
            .gt("current_streak", 0)
            .neq("last_activity_date", today)
            .limit(2000);

          const streakUsers = (atRisk ?? []).filter(
            (u) => (u.current_streak ?? 0) > 0,
          );

          let sent = 0;
          // Batch push in groups of 50
          for (let i = 0; i < streakUsers.length; i += 50) {
            const batch = streakUsers.slice(i, i + 50);
            await Promise.all(
              batch.map((u) =>
                sendPushToUsers([u.user_id], {
                  title: `🔥 ${u.current_streak}-day streak at risk!`,
                  body: "Aaj ka daily quiz complete karo — sirf 10 questions, 5 minute.",
                  url: "/daily-quiz",
                  tag: "streak-reminder",
                }).catch(() => null),
              ),
            );
            sent += batch.length;
          }

          return Response.json({ ok: true, notified: sent });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "unknown";
          console.error("[comeback-notify]", msg);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
