import { geminiChat } from "@/lib/gemini-direct.server";
/**
 * Server-only helpers: generate bilingual daily quizzes (Mixed + Current Affairs)
 * using Lovable AI (Gemini) and persist to question_bank + daily_quizzes.
 */

type Bilingual = { en: string; hi: string };
type GeneratedQ = {
  text: Bilingual;
  options: [Bilingual, Bilingual, Bilingual, Bilingual];
  correct: number;
  explanation: Bilingual;
  subject: string;
  topic: string;
};

const MIXED_SYSTEM = `You are an SSC CGL exam question writer. Generate exactly 10 high-quality bilingual (English + Hindi) MCQs.
Rules:
- Mix subjects: 3 General Awareness, 3 Quantitative Aptitude, 2 Reasoning, 2 English.
- Each question must have exactly 4 options and exactly one correct answer.
- Provide BOTH English and Hindi translations for question text, every option, and the explanation.
- Include a specific "topic" per question (e.g. "History", "Algebra", "Coding-Decoding", "Synonyms").
- Difficulty: SSC CGL Tier 1. Clear, unambiguous, factually correct.
- No images, no LaTeX. Plain text only.
- Use these EXACT subject names: "General Awareness", "Quantitative Aptitude", "General Intelligence and Reasoning", "English Comprehension".
- Return ONLY valid JSON (no markdown, no prose) matching:
{"questions":[{"text":{"en":"...","hi":"..."},"options":[{"en":"...","hi":"..."},{"en":"...","hi":"..."},{"en":"...","hi":"..."},{"en":"...","hi":"..."}],"correct":0,"explanation":{"en":"...","hi":"..."},"subject":"...","topic":"..."}]}`;

const CA_SYSTEM = `You are an SSC exam current-affairs question writer. Generate bilingual (English + Hindi) MCQs strictly from YESTERDAY'S news only.
Rules:
- STRICT DATE RULE: every question must be based on an event that was reported on the PREVIOUS DAY (the date given in the user prompt). Do NOT use older news, do NOT use "last 7 days" or "last 30 days" news, do NOT use evergreen/static GK.
- COUNT IS FLEXIBLE: return only as many questions as there are genuinely important, exam-relevant news items from that single day. If only one important item exists, return exactly 1 question. Maximum 5. Never pad with filler, older news, or invented facts.
- Cover only exam-relevant items: national & international news, awards, appointments, government schemes, science & tech, sports, economy, defence exercises, summits, obituaries, reports & indices.
- Only include facts that are widely reported and verifiable. Skip anything speculative.
- Each question: exactly 4 options and exactly one correct answer.
- Provide BOTH English and Hindi for text, options, and explanation.
- Include a "topic" per question (e.g. "Awards", "Sports", "Appointments", "Schemes").
- Each question must cover a DIFFERENT event from that day. No repeats or paraphrases.
- Mention the event date inside the explanation.
- Return ONLY valid JSON (no markdown, no prose) matching:
{"questions":[{"text":{"en":"...","hi":"..."},"options":[{"en":"...","hi":"..."},{"en":"...","hi":"..."},{"en":"...","hi":"..."},{"en":"...","hi":"..."}],"correct":0,"explanation":{"en":"...","hi":"..."},"subject":"Current Affairs","topic":"..."}]}`;

const SUBJECT_ALIASES: Record<string, string> = {
  english: "English Comprehension",
  "english language": "English Comprehension",
  "english comprehension": "English Comprehension",
  reasoning: "General Intelligence and Reasoning",
  "general intelligence": "General Intelligence and Reasoning",
  "general intelligence and reasoning": "General Intelligence and Reasoning",
  "quantitative aptitude": "Quantitative Aptitude",
  quant: "Quantitative Aptitude",
  maths: "Quantitative Aptitude",
  "general awareness": "General Awareness",
  gk: "General Awareness",
  "current affairs": "Current Affairs",
};

function normalizeSubject(s: string): string {
  const k = (s || "").trim().toLowerCase();
  return SUBJECT_ALIASES[k] ?? (s || "General Awareness").trim();
}


function readBilingual(v: unknown, fallback = ""): Bilingual {
  if (v && typeof v === "object") {
    const o = v as { en?: unknown; hi?: unknown };
    const en = String(o.en ?? "").trim();
    const hi = String(o.hi ?? "").trim();
    return { en: en || hi || fallback, hi: hi || en || fallback };
  }
  const s = typeof v === "string" ? v : fallback;
  return { en: s, hi: s };
}

const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Calls the AI gateway with retries + model fallback so a single hiccup doesn't skip the day. */
async function callGemini(system: string, user: string, minCount: number): Promise<GeneratedQ[]> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    const model = MODELS[Math.min(attempt, MODELS.length - 1)]!;
    try {
      return await callGeminiOnce(system, user, minCount, model);
    } catch (e) {
      lastErr = e;
      console.error(`[daily-quiz] attempt ${attempt + 1} (${model}) failed:`, e instanceof Error ? e.message : e);
      await sleep(2000 * (attempt + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("AI generation failed");
}

async function callGeminiOnce(system: string, user: string, minCount: number, model: string): Promise<GeneratedQ[]> {
  const raw = await geminiChat({
    model,
    json: true,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  let parsed: { questions?: unknown[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("AI returned invalid JSON");
    parsed = JSON.parse(m[0]);
  }
  const qs = parsed.questions;
  if (!Array.isArray(qs) || qs.length < minCount)
    throw new Error(`AI returned fewer than ${minCount} questions`);

  return qs.map((raw) => {
    const q = raw as {
      text?: unknown;
      options?: unknown[];
      correct?: unknown;
      explanation?: unknown;
      subject?: unknown;
      topic?: unknown;
    };
    const opts = Array.isArray(q.options) ? q.options : [];
    const rawSubject = String(q.subject ?? "General Awareness").trim();
    return {
      text: readBilingual(q.text),
      options: [
        readBilingual(opts[0]),
        readBilingual(opts[1]),
        readBilingual(opts[2]),
        readBilingual(opts[3]),
      ] as [Bilingual, Bilingual, Bilingual, Bilingual],
      correct: Math.max(0, Math.min(3, Number(q.correct) || 0)),
      explanation: readBilingual(q.explanation),
      subject: normalizeSubject(rawSubject),
      topic: String(q.topic ?? "").trim() || "General",
    };
  });
}


/** "Jan–Jun 2026" or "Jul–Dec 2026" style label based on the given IST date. */
export function halfYearTopic(istDate: Date): string {
  const y = istDate.getUTCFullYear();
  const m = istDate.getUTCMonth(); // 0-11
  return m < 6 ? `Jan–Jun ${y}` : `Jul–Dec ${y}`;
}

async function persistQuiz(opts: {
  quiz_type: "mixed" | "current_affairs";
  system: string;
  userPrompt: string;
  minCount: number;
  targetCount?: number;
  maxCount?: number;
  subjectOverride?: string;
  topicOverride?: (istDate: Date) => string;
  forceReplace?: boolean;
}): Promise<{ quiz_id: string; quiz_date: string; created: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const quiz_date = istNow.toISOString().slice(0, 10);

  const { data: existing } = await supabaseAdmin
    .from("daily_quizzes")
    .select("id")
    .eq("quiz_date", quiz_date)
    .eq("quiz_type", opts.quiz_type)
    .maybeSingle();

  if (existing && !opts.forceReplace) {
    return { quiz_id: existing.id, quiz_date, created: false };
  }

  // Pull recent daily-quiz question texts of the same type to avoid repeats.
  const lookbackDays = opts.quiz_type === "current_affairs" ? 180 : 30;
  const sinceDate = new Date(istNow.getTime() - lookbackDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data: recentQuizzes } = await supabaseAdmin
    .from("daily_quizzes")
    .select("question_ids")
    .eq("quiz_type", opts.quiz_type)
    .gte("quiz_date", sinceDate);
  const recentIds = (recentQuizzes ?? []).flatMap((r) => (r.question_ids as string[]) ?? []);
  let recentTexts: string[] = [];
  if (recentIds.length > 0) {
    const { data: recentQs } = await supabaseAdmin
      .from("question_bank")
      .select("text")
      .in("id", recentIds.slice(-200));
    recentTexts = (recentQs ?? [])
      .map((r) => {
        const t = r.text as { en?: string } | string | null;
        if (!t) return "";
        if (typeof t === "string") return t;
        return t.en ?? "";
      })
      .filter(Boolean)
      // Keep the prompt small so the model reliably returns the full JSON payload.
      .slice(-120)
      .map((t) => (t.length > 140 ? `${t.slice(0, 140)}…` : t));
  }

  const avoidBlock =
    recentTexts.length > 0
      ? `\n\nCRITICAL: Do NOT repeat, paraphrase, or re-ask the same fact as ANY of these previously-asked questions from the last ${lookbackDays} days. Generate entirely fresh questions on different facts/topics/angles${opts.quiz_type === "current_affairs" ? " — if that leaves fewer questions, return fewer; never pad with a repeat or with older news" : ""}. Previously asked:\n${recentTexts.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
      : "";

  const finalPrompt = opts.userPrompt + avoidBlock;
  const questions = await callGemini(opts.system, finalPrompt, opts.minCount);
  const take = opts.targetCount ?? Math.min(questions.length, opts.maxCount ?? questions.length);
  const list = questions.slice(0, take);

  const caTopic =
    opts.quiz_type === "current_affairs"
      ? (opts.topicOverride ?? halfYearTopic)(istNow)
      : null;
  // Save into the normal practice bank so questions appear under their subject/topic.
  // Use the AI-provided per-question topic so questions are organized topic-wise,
  // not lumped under a single "Daily Quiz" folder.
  const categoryType = "subject_practice";

  const rows = list.map((q) => ({
    subject: opts.subjectOverride ?? q.subject,
    text: q.text,
    options: q.options.map((opt, i) => ({ text: opt, isCorrect: i === q.correct })),
    correct: q.correct,
    explanation: q.explanation,
    category_type: categoryType,
    topic_name: caTopic
      ? `${caTopic} > ${q.topic || "Mixed"}`
      : q.topic || "General",
    difficulty: "medium",
  }));


  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("question_bank")
    .insert(rows)
    .select("id");
  if (insErr) throw new Error(`Insert questions failed: ${insErr.message}`);
  if (!inserted || inserted.length === 0) throw new Error("Failed to persist questions");

  const question_ids = inserted.map((r) => r.id);

  if (existing) {
    const { error: uErr } = await supabaseAdmin
      .from("daily_quizzes")
      .update({ question_ids, created_by_type: "ai", published: true })
      .eq("id", existing.id);
    if (uErr) throw new Error(uErr.message);
    return { quiz_id: existing.id, quiz_date, created: false };
  }

  const { data: quiz, error: qErr } = await supabaseAdmin
    .from("daily_quizzes")
    .insert({
      quiz_date,
      question_ids,
      created_by_type: "ai",
      published: true,
      quiz_type: opts.quiz_type,
    })
    .select("id")
    .single();
  if (qErr) throw new Error(qErr.message);

  return { quiz_id: quiz.id, quiz_date, created: true };
}

/** Mixed 10-question daily quiz (GA + Quant + Reasoning + English) in EN+HI. */
export async function generateAndPersistDailyQuiz(o?: { forceReplace?: boolean }) {
  return persistQuiz({
    quiz_type: "mixed",
    system: MIXED_SYSTEM,
    userPrompt: `Generate 10 fresh bilingual SSC CGL practice questions for today (${new Date().toISOString().slice(0, 10)}). Return JSON only.`,
    minCount: 10,
    targetCount: 10,
    forceReplace: o?.forceReplace,
  });
}

/** Current Affairs bilingual daily quiz — strictly from the previous day's news.
 * Count is flexible (1–5) depending on how many important events happened.
 * Also catalogued under subject "Current Affairs" with a 6-month topic folder. */
export async function generateAndPersistCurrentAffairs(o?: { forceReplace?: boolean }) {
  const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const yesterday = new Date(istNow.getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return persistQuiz({
    quiz_type: "current_affairs",
    system: CA_SYSTEM,
    userPrompt: `Generate current-affairs MCQs (bilingual English+Hindi) using ONLY news events reported on ${yesterday} (IST) — the previous day. Do not use any news from any other date. Return one question per important event of that day: if only one important event exists, return exactly 1 question; return at most 5. Never pad with older or generic questions. Return JSON only.`,
    minCount: 1,
    maxCount: 5,
    subjectOverride: "Current Affairs",
    forceReplace: o?.forceReplace,
  });
}
