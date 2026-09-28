/**
 * Cron endpoint: scans the government-job source site, asks Gemini to write
 * article drafts for new postings, saves them as PENDING drafts and pushes a
 * notification to the admin. Nothing is published automatically.
 * Auth: `apikey` header must equal SUPABASE_PUBLISHABLE_KEY.
 */
import { createFileRoute } from "@tanstack/react-router";
import { scanAndDraftJobs } from "@/lib/job-scan.server";
import { sendPushToUsers } from "@/lib/fcm.server";
import { ADMIN_EMAIL } from "@/lib/admin-constants";

export const Route = createFileRoute("/api/public/hooks/scan-govt-jobs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const provided = request.headers.get("apikey");
        if (!expected || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const result = await scanAndDraftJobs();
          if (result.created > 0) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data: admins } = await supabaseAdmin
              .from("profiles")
              .select("id")
              .ilike("email", ADMIN_EMAIL);
            const ids = (admins ?? []).map((r) => r.id as string);
            if (ids.length) {
              await sendPushToUsers(ids, {
                title: `${result.created} new job article${result.created > 1 ? "s" : ""} ready`,
                body:
                  result.titles.slice(0, 2).join(" • ") +
                  (result.titles.length > 2 ? " …" : "") +
                  " — review and publish",
                url: "/admin/job-drafts",
                tag: "job_drafts",
              });
            }
          }
          return Response.json({ ok: true, ...result });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "unknown";
          console.error("[scan-govt-jobs]", msg);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
