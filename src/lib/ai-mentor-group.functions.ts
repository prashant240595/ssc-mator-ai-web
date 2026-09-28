import { createServerFn } from "@tanstack/react-start";
import { geminiChat, GeminiQuotaError } from "@/lib/gemini-direct.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MENTOR_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee1";

const Input = z.object({ groupId: z.string().uuid() });

export const generateGroupMentorReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => Input.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const groupId = data.groupId;

    // Confirm mentor is a member of this group
    const { data: member } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .eq("user_id", MENTOR_ID)
      .maybeSingle();
    if (!member) return { skipped: true };

    // Fetch last ~15 messages
    const { data: msgs, error: mErr } = await supabase
      .from("group_messages")
      .select("user_id, content, created_at")
      .eq("group_id", groupId)
      .eq("message_type", "text")
      .order("created_at", { ascending: false })
      .limit(15);
    if (mErr) throw new Error(mErr.message);
    const history = (msgs ?? []).reverse();

    // Build name map (for context)
    const ids = Array.from(new Set(history.map((h) => h.user_id)));
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    const nameOf = new Map((profs ?? []).map((p: any) => [p.id, p.full_name ?? "Student"]));

    const { data: mentor } = await supabase
      .from("profiles")
      .select("persona, full_name")
      .eq("id", MENTOR_ID)
      .maybeSingle();

    const systemPrompt =
      (mentor?.persona ??
        `You are SSC Mentor, an experienced SSC teacher. Reply in Hinglish, 2-5 short sentences, WhatsApp chat style. Never say you are AI. No markdown.`) +
      "\nYou are chatting inside a study group. Reply like a teacher explaining to students.";

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({
        role: m.user_id === MENTOR_ID ? "assistant" : "user",
        content:
          m.user_id === MENTOR_ID
            ? (m.content ?? "")
            : `${nameOf.get(m.user_id) ?? "Student"}: ${m.content ?? ""}`,
      })),
    ];

    let reply = "";
    try {
      reply = (
        await geminiChat({ messages: messages as any, maxTokens: 300 })
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
    if (!reply) reply = "Haan bolo, mai yahin hu 😊";
    if (reply.length > 1000) reply = reply.slice(0, 1000);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insErr } = await supabaseAdmin
      .from("group_messages")
      .insert({
        group_id: groupId,
        user_id: MENTOR_ID,
        content: reply,
        message_type: "text",
      });
    if (insErr) throw new Error(insErr.message);

    return { ok: true, reply };
  });
