/**
 * Cron endpoint: called daily at 6 AM IST by pg_cron.
 * Generates today's daily quiz using Lovable AI (Gemini) if not already present.
 * Auth: `apikey` header must equal SUPABASE_PUBLISHABLE_KEY.
 */
import { createFileRoute } from "@tanstack/react-router";
import { generateAndPersistDailyQuiz } from "@/lib/daily-quiz.server";

export const Route = createFileRoute("/api/public/hooks/generate-daily-quiz")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const provided = request.headers.get("apikey");
        if (!expected || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const result = await generateAndPersistDailyQuiz();
          return Response.json({ ok: true, ...result });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "unknown";
          console.error("[generate-daily-quiz]", msg);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
