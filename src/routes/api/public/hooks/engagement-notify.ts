/**
 * Cron endpoint: nudges users who started but didn't finish an exam,
 * and users who browsed a subject/topic but didn't continue practicing.
 * Includes social-proof (X users solving today) to motivate action.
 * Auth: `apikey` header must equal SUPABASE_PUBLISHABLE_KEY.
 */
import { createFileRoute } from "@tanstack/react-router";
import { sendPushToUsers } from "@/lib/fcm.server";

export const Route = createFileRoute("/api/public/hooks/engagement-notify")({
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

          const now = Date.now();
          const since72h = new Date(now - 72 * 3600 * 1000).toISOString();
          const since24h = new Date(now - 24 * 3600 * 1000).toISOString();
          const since2h = new Date(now - 2 * 3600 * 1000).toISOString();
          const since48h = new Date(now - 48 * 3600 * 1000).toISOString();

          // Social proof: distinct active users (any activity) in last 24h
          const { data: activeRows } = await supabaseAdmin
            .from("user_activity_logs")
            .select("user_id")
            .gte("created_at", since24h)
            .limit(5000);
          const activeCount =
            new Set((activeRows ?? []).map((r) => r.user_id as string)).size || 0;
          const socialLine =
            activeCount > 1
              ? `${activeCount} students are solving questions right now — join them!`
              : `Fellow SSC aspirants are practicing right now — join them!`;

          // ---- 1) Abandoned exam nudges ----
          // Users who started exam in last 72h but haven't submitted since then
          const { data: started } = await supabaseAdmin
            .from("user_activity_logs")
            .select("user_id, created_at")
            .eq("activity_type", "started_exam")
            .gte("created_at", since72h)
            .lte("created_at", since2h) // wait at least 2h before nudging
            .limit(5000);

          const startedByUser = new Map<string, string>();
          for (const r of started ?? []) {
            const uid = r.user_id as string;
            const ts = r.created_at as string;
            const prev = startedByUser.get(uid);
            if (!prev || ts > prev) startedByUser.set(uid, ts);
          }

          const { data: submitted } = await supabaseAdmin
            .from("user_activity_logs")
            .select("user_id, created_at")
            .eq("activity_type", "submitted_exam")
            .gte("created_at", since72h)
            .limit(5000);

          const submittedByUser = new Map<string, string>();
          for (const r of submitted ?? []) {
            const uid = r.user_id as string;
            const ts = r.created_at as string;
            const prev = submittedByUser.get(uid);
            if (!prev || ts > prev) submittedByUser.set(uid, ts);
          }

          const abandonUsers: string[] = [];
          for (const [uid, startTs] of startedByUser) {
            const subTs = submittedByUser.get(uid);
            if (!subTs || subTs < startTs) abandonUsers.push(uid);
          }

          // ---- 2) Stuck-on-subject nudges ----
          // Users who viewed a subject/exam/shift/topic in last 48h but did NOT
          // start any exam after that view, and are not already in the abandoned list
          const { data: browsed } = await supabaseAdmin
            .from("user_activity_logs")
            .select("user_id, created_at, activity_type")
            .in("activity_type", ["viewed_subject", "viewed_exam", "viewed_shift"])
            .gte("created_at", since48h)
            .lte("created_at", since2h)
            .limit(5000);

          const browsedByUser = new Map<string, string>();
          for (const r of browsed ?? []) {
            const uid = r.user_id as string;
            const ts = r.created_at as string;
            const prev = browsedByUser.get(uid);
            if (!prev || ts > prev) browsedByUser.set(uid, ts);
          }

          const stuckUsers: string[] = [];
          for (const [uid, viewTs] of browsedByUser) {
            if (abandonUsers.includes(uid)) continue;
            const startTs = startedByUser.get(uid);
            if (startTs && startTs >= viewTs) continue; // already moved on
            stuckUsers.push(uid);
          }

          // De-dupe against very recent pushes: cap batches
          const notifyAbandon = abandonUsers.slice(0, 500);
          const notifyStuck = stuckUsers.slice(0, 500);

          let sent = 0;
          for (let i = 0; i < notifyAbandon.length; i += 50) {
            const batch = notifyAbandon.slice(i, i + 50);
            await sendPushToUsers(batch, {
              title: "Your exam is still waiting ⏳",
              body: `You started an exam but didn't finish. ${socialLine}`,
              url: "/exams",
              tag: "abandoned-exam",
            }).catch(() => null);
            sent += batch.length;
          }
          for (let i = 0; i < notifyStuck.length; i += 50) {
            const batch = notifyStuck.slice(i, i + 50);
            await sendPushToUsers(batch, {
              title: "Keep the momentum going 🚀",
              body: `You checked out a topic — now solve a few questions. ${socialLine}`,
              url: "/practice",
              tag: "stuck-subject",
            }).catch(() => null);
            sent += batch.length;
          }

          return Response.json({
            ok: true,
            active_users_24h: activeCount,
            abandon_notified: notifyAbandon.length,
            stuck_notified: notifyStuck.length,
            total_pushed: sent,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "unknown";
          console.error("[engagement-notify]", msg);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
