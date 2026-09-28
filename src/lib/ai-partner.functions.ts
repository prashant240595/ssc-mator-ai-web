import { createServerFn } from "@tanstack/react-start";
import { geminiChat, GeminiQuotaError } from "@/lib/gemini-direct.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({ botId: z.string().uuid() });

export const generateAiPartnerReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => Input.parse(v))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const botId = data.botId;

    // Look up bot persona
    const { data: bot, error: botErr } = await supabase
      .from("profiles")
      .select("id, full_name, persona, is_ai")
      .eq("id", botId)
      .maybeSingle();
    if (botErr) throw new Error(botErr.message);
    if (!bot || !bot.is_ai) return { skipped: true };

    // Fetch last ~20 messages between user and bot
    const { data: msgs, error: mErr } = await supabase
      .from("direct_messages")
      .select("sender_id, content, created_at")
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${botId}),and(sender_id.eq.${botId},receiver_id.eq.${userId})`,
      )
      .order("created_at", { ascending: false })
      .limit(20);
    if (mErr) throw new Error(mErr.message);
    const history = (msgs ?? []).reverse();

    const systemPrompt =
      (bot.persona ?? `You are ${bot.full_name}, a friendly SSC study buddy.`) +
      "\nRules: reply in Hinglish, 1-3 short sentences, WhatsApp chat style. Encourage daily study, share small tips, gently push mock tests. Never say you are AI or a bot. Never mention Gemini/OpenAI. Do not use markdown.";

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({
        role: m.sender_id === botId ? "assistant" : "user",
        content: m.content,
      })),
    ];

    let reply = "";
    try {
      reply = (
        await geminiChat({ messages: messages as any, maxTokens: 200 })
      ).trim();
      // Success: clear any stale "AI unavailable" flag.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("app_flags").delete().eq("key", "ai_credits_exhausted_at");
    } catch (err) {
      if (err instanceof GeminiQuotaError) {
        // Gemini quota exhausted / key blocked: flag it so AI profiles show as offline,
        // and fail silently instead of showing an error to the student.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("app_flags")
          .upsert(
            { key: "ai_credits_exhausted_at", value: {}, updated_at: new Date().toISOString() },
            { onConflict: "key" },
          );
        return { skipped: true, unavailable: true };
      }
      throw err;
    }
    if (!reply) reply = "Haan bolo! 😊";
    if (reply.length > 800) reply = reply.slice(0, 800);

    // Insert as bot via admin client (bypasses RLS since bot has no auth session)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insErr } = await supabaseAdmin
      .from("direct_messages")
      .insert({ sender_id: botId, receiver_id: userId, content: reply });
    if (insErr) throw new Error(insErr.message);

    return { ok: true, reply };
  });
