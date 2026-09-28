/**
 * Cron endpoint: daily 6:15 AM IST — generate bilingual Current Affairs quiz.
 * Auth: `apikey` header must equal SUPABASE_PUBLISHABLE_KEY.
 */
import { createFileRoute } from "@tanstack/react-router";
import { generateAndPersistCurrentAffairs } from "@/lib/daily-quiz.server";

export const Route = createFileRoute("/api/public/hooks/generate-current-affairs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const provided = request.headers.get("apikey");
        if (!expected || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const result = await generateAndPersistCurrentAffairs();
          return Response.json({ ok: true, ...result });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "unknown";
          console.error("[generate-current-affairs]", msg);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
