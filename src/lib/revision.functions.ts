import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { REVISION_INTERVALS, nextSchedule, istToday, addDays } from "@/lib/revision-schedule";

const DifficultySchema = z.enum(["easy", "medium", "hard"]);

/** All active + recently completed revision topics of the signed-in user. */
export const listRevisionTopics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("revision_topics")
      .select("*")
      .eq("user_id", userId)
      .order("next_review_date", { ascending: true })
      .limit(300);
    if (error) throw new Error(error.message);

    const today = istToday();
    const rows = data ?? [];
    return {
      today,
      topics: rows,
      dueCount: rows.filter(
        (r) => r.status === "active" && (r.next_review_date as string) <= today,
      ).length,
      activeCount: rows.filter((r) => r.status === "active").length,
      masteredCount: rows.filter((r) => r.status === "completed").length,
    };
  });

/** Add a topic — first revision is scheduled for tomorrow. */
export const addRevisionTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        title: z.string().trim().min(2).max(120),
        subject: z.string().trim().max(60).optional().nullable(),
        notes: z.string().trim().max(1000).optional().nullable(),
        startToday: z.boolean().optional(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const next = data.startToday ? istToday() : addDays(istToday(), REVISION_INTERVALS[0]!);
    const { data: row, error } = await supabase
      .from("revision_topics")
      .insert({
        user_id: userId,
        title: data.title,
        subject: data.subject || null,
        notes: data.notes || null,
        stage: 0,
        next_review_date: next,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Mark a topic revised with Easy / Medium / Hard feedback. */
export const reviewRevisionTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ id: z.string().uuid(), difficulty: DifficultySchema }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: topic, error: fErr } = await supabase
      .from("revision_topics")
      .select("id, stage, review_count")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (fErr || !topic) throw new Error("Topic not found");

    const plan = nextSchedule(topic.stage ?? 0, data.difficulty);

    const { data: row, error } = await supabase
      .from("revision_topics")
      .update({
        stage: plan.stage,
        next_review_date: plan.nextDate,
        status: plan.status,
        review_count: (topic.review_count ?? 0) + 1,
        last_reviewed_at: new Date().toISOString(),
        last_difficulty: data.difficulty,
      })
      .eq("id", data.id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Delete a topic. */
export const deleteRevisionTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("revision_topics")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Restart a mastered topic from the beginning. */
export const restartRevisionTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("revision_topics")
      .update({
        status: "active",
        stage: 0,
        next_review_date: istToday(),
      })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
