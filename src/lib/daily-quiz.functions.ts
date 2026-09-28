import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const QuizTypeSchema = z.enum(["mixed", "current_affairs"]).default("mixed");

/** Fetch today's daily quiz (with questions) — anyone can call. */
export const getTodayDailyQuiz = createServerFn({ method: "GET" })
  .inputValidator((v: unknown) =>
    z.object({ type: QuizTypeSchema.optional() }).default({}).parse(v ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const today = istNow.toISOString().slice(0, 10);
    const quiz_type = data.type ?? "mixed";

    const { data: quiz } = await supabaseAdmin
      .from("daily_quizzes")
      .select("id, quiz_date, question_ids, created_by_type, published, quiz_type")
      .eq("quiz_date", today)
      .eq("quiz_type", quiz_type)
      .eq("published", true)
      .maybeSingle();

    if (!quiz) return { quiz: null, questions: [] };

    const { data: qs } = await supabaseAdmin
      .from("question_bank")
      .select("id, subject, text, options, correct, explanation")
      .in("id", quiz.question_ids as string[]);

    const idx = new Map((quiz.question_ids as string[]).map((id, i) => [id, i]));
    const ordered = (qs ?? []).slice().sort((a, b) => (idx.get(a.id) ?? 0) - (idx.get(b.id) ?? 0));

    return { quiz, questions: ordered };
  });

/** Submit user's attempt. Streak trigger fires automatically. */
export const submitDailyQuizAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        quiz_id: z.string().uuid(),
        answers: z.array(z.number().int().min(-1).max(15)),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    const { data: quiz, error: qErr } = await supabase
      .from("daily_quizzes")
      .select("id, quiz_date, question_ids")
      .eq("id", data.quiz_id)
      .single();
    if (qErr || !quiz) throw new Error("Quiz not found");

    const qids = quiz.question_ids as string[];
    const { data: qs, error: bErr } = await supabase
      .from("question_bank")
      .select("id, correct")
      .in("id", qids);
    if (bErr) throw new Error(bErr.message);

    const correctMap = new Map((qs ?? []).map((q) => [q.id, q.correct]));
    let correct_count = 0;
    qids.forEach((qid, i) => {
      const answer = data.answers[i];
      if (answer !== undefined && answer >= 0 && correctMap.get(qid) === answer) correct_count += 1;
    });

    const { error: aErr } = await supabase.from("daily_quiz_attempts").upsert(
      {
        user_id: userId,
        quiz_id: data.quiz_id,
        quiz_date: quiz.quiz_date,
        correct_count,
        total_count: qids.length,
        answers: data.answers,
      },
      { onConflict: "user_id,quiz_id" },
    );
    if (aErr) throw new Error(aErr.message);

    return { correct_count, total_count: qids.length };
  });

/** Fetch current user's streak + today's mixed-quiz attempt status. */
export const getUserStreakInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: streak } = await supabase
      .from("user_streaks")
      .select(
        "current_streak, longest_streak, last_activity_date, freeze_available, total_active_days",
      )
      .eq("user_id", userId)
      .maybeSingle();

    const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const today = istNow.toISOString().slice(0, 10);

    const { data: todayAttempt } = await supabase
      .from("daily_quiz_attempts")
      .select("quiz_id, correct_count, total_count, answers")
      .eq("user_id", userId)
      .eq("quiz_date", today)
      .maybeSingle();

    return {
      current_streak: streak?.current_streak ?? 0,
      longest_streak: streak?.longest_streak ?? 0,
      freeze_available: streak?.freeze_available ?? 1,
      total_active_days: streak?.total_active_days ?? 0,
      last_activity_date: streak?.last_activity_date ?? null,
      today_attempt: todayAttempt ?? null,
    };
  });

/** Admin: generate today's Mixed quiz using AI. */
export const adminGenerateDailyQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ replace: z.boolean().optional() }).parse(v))
  .handler(async ({ data, context }) => {
    const { claims } = context;
    if ((claims?.email as string | undefined) !== "prashant.singh.2405@gmail.com") {
      throw new Error("Forbidden");
    }
    const { generateAndPersistDailyQuiz } = await import("./daily-quiz.server");
    return await generateAndPersistDailyQuiz({ forceReplace: !!data.replace });
  });

/** Admin: generate today's Current Affairs quiz using AI. */
export const adminGenerateCurrentAffairs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ replace: z.boolean().optional() }).parse(v))
  .handler(async ({ data, context }) => {
    const { claims } = context;
    if ((claims?.email as string | undefined) !== "prashant.singh.2405@gmail.com") {
      throw new Error("Forbidden");
    }
    const { generateAndPersistCurrentAffairs } = await import("./daily-quiz.server");
    return await generateAndPersistCurrentAffairs({ forceReplace: !!data.replace });
  });

/** Admin: create today's Mixed quiz manually with 10 bilingual questions. */
export const adminCreateManualDailyQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        questions: z
          .array(
            z.object({
              text_en: z.string().min(3),
              text_hi: z.string().min(1),
              options_en: z.array(z.string().min(1)).length(4),
              options_hi: z.array(z.string().min(1)).length(4),
              correct: z.number().int().min(0).max(3),
              explanation_en: z.string().optional().default(""),
              explanation_hi: z.string().optional().default(""),
              subject: z.string().default("General Awareness"),
            }),
          )
          .length(10),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { claims, userId } = context;
    if ((claims?.email as string | undefined) !== "prashant.singh.2405@gmail.com") {
      throw new Error("Forbidden");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const quiz_date = istNow.toISOString().slice(0, 10);

    const rows = data.questions.map((q) => ({
      subject: q.subject,
      text: { en: q.text_en, hi: q.text_hi },
      options: q.options_en.map((opt, i) => ({
        text: { en: opt, hi: q.options_hi[i] ?? opt },
        isCorrect: i === q.correct,
      })),
      correct: q.correct,
      explanation: { en: q.explanation_en, hi: q.explanation_hi || q.explanation_en },
      category_type: "daily_quiz",
      topic_name: quiz_date,
      difficulty: "medium",
      created_by: userId,
    }));

    const { data: inserted, error } = await supabaseAdmin
      .from("question_bank")
      .insert(rows)
      .select("id");
    if (error) throw new Error(error.message);
    if (!inserted || inserted.length !== 10) throw new Error("Failed to insert questions");

    const question_ids = inserted.map((r) => r.id);

    const { data: existing } = await supabaseAdmin
      .from("daily_quizzes")
      .select("id")
      .eq("quiz_date", quiz_date)
      .eq("quiz_type", "mixed")
      .maybeSingle();

    if (existing) {
      const { error: uErr } = await supabaseAdmin
        .from("daily_quizzes")
        .update({
          question_ids,
          created_by_type: "admin",
          created_by: userId,
          published: true,
        })
        .eq("id", existing.id);
      if (uErr) throw new Error(uErr.message);
      return { quiz_id: existing.id, quiz_date };
    }

    const { data: q, error: qErr } = await supabaseAdmin
      .from("daily_quizzes")
      .insert({
        quiz_date,
        question_ids,
        created_by_type: "admin",
        created_by: userId,
        published: true,
        quiz_type: "mixed",
      })
      .select("id")
      .single();
    if (qErr) throw new Error(qErr.message);
    return { quiz_id: q.id, quiz_date };
  });
