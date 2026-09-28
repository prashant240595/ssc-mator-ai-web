/**
 * Cron endpoint: daily push to users who have NOT completed any mock test / PYQ yet.
 * Keeps nudging until the user has at least one `student_results` row.
 * Auth: `apikey` header must equal SUPABASE_PUBLISHABLE_KEY.
 */
import { createFileRoute } from "@tanstack/react-router";
import { sendPushToUsers } from "@/lib/fcm.server";

export const Route = createFileRoute("/api/public/hooks/no-mock-notify")({
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

          // All reachable users (have device tokens)
          const { data: tokRows } = await supabaseAdmin
            .from("device_tokens")
            .select("user_id");
          const reachable = Array.from(
            new Set((tokRows ?? []).map((r) => r.user_id as string)),
          );
          if (reachable.length === 0) return Response.json({ ok: true, notified: 0 });

          // Users who already completed at least one exam
          const { data: doneRows } = await supabaseAdmin
            .from("student_results")
            .select("user_id");
          const doneSet = new Set((doneRows ?? []).map((r) => r.user_id as string));

          // Exclude AI bots
          const { data: ai } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("is_ai", true);
          const aiSet = new Set((ai ?? []).map((r) => r.id as string));

          const targets = reachable.filter((u) => !doneSet.has(u) && !aiSet.has(u));
          if (targets.length === 0) return Response.json({ ok: true, notified: 0 });

          let sent = 0;
          for (let i = 0; i < targets.length; i += 50) {
            const batch = targets.slice(i, i + 50);
            await sendPushToUsers(batch, {
              title: "Apna pehla mock test try karo 📝",
              body: "Sirf 1 mock test attempt karo — apni rank aur weak topics turant dikhengey!",
              url: "/mock-tests",
              tag: "no-mock-yet",
            }).catch(() => null);
            sent += batch.length;
          }

          return Response.json({ ok: true, notified: sent });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "unknown";
          console.error("[no-mock-notify]", msg);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
