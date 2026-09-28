import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Lang = "en" | "hi";

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const analyzeStudentProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { language?: Lang; previousHash?: string } | undefined) => ({
    language: (input?.language === "hi" ? "hi" : "en") as Lang,
    previousHash: input?.previousHash ?? "",
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const language: Lang = data.language;

    const [{ data: profile }, { data: results }, { data: activity }] = await Promise.all([
      supabase.from("profiles").select("id,email,full_name,created_at").eq("id", userId).maybeSingle(),
      supabase
        .from("student_results")
        .select("exam_id,total_score,correct_count,incorrect_count,unattempted_count,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("user_activity_logs" as never)
        .select("activity_type,details,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const examIds = Array.from(new Set((results ?? []).map((r) => r.exam_id).filter(Boolean)));
    let examsById: Record<string, { exam_name: string; exam_type: string }> = {};
    if (examIds.length) {
      const { data: exams } = await supabase
        .from("exam_metadata")
        .select("id,exam_name,exam_type")
        .in("id", examIds as string[]);
      examsById = Object.fromEntries((exams ?? []).map((e) => [e.id, { exam_name: e.exam_name, exam_type: e.exam_type }]));
    }
    const enrichedResults = (results ?? []).map((r) => ({
      ...r,
      exam: examsById[r.exam_id] ?? null,
    }));

    const totals = enrichedResults.reduce(
      (acc, r) => {
        acc.attempts += 1;
        acc.totalScore += Number(r.total_score) || 0;
        acc.correct += r.correct_count || 0;
        acc.incorrect += r.incorrect_count || 0;
        acc.unattempted += r.unattempted_count || 0;
        return acc;
      },
      { attempts: 0, totalScore: 0, correct: 0, incorrect: 0, unattempted: 0 },
    );

    const studentData = {
      profile,
      summary: totals,
      recent_results: enrichedResults.slice(0, 15),
      recent_activity: activity ?? [],
    };

    // Hash includes language so switching language regenerates once
    const hashInput = JSON.stringify({ studentData, language });
    const dataHash = await sha256(hashInput);

    // If client already has a cached response for this exact data + language, skip the AI call
    if (data.previousHash && data.previousHash === dataHash) {
      return {
        ok: true as const,
        unchanged: true as const,
        hash: dataHash,
        analysis: "",
        data: studentData,
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        ok: false as const,
        error: "AI mentor is not configured. Please contact support.",
        hash: dataHash,
        data: studentData,
      };
    }

    const langInstruction =
      language === "hi"
        ? "Reply in Hindi (Devanagari script). Use simple, friendly Hindi."
        : "Reply in English. Use simple, friendly English.";

    const prompt = `You are an expert SSC Mentor. Below is the complete historical learning data of a student in JSON.

Analyse strengths, weaknesses, and study patterns. Give a personalised, warm, encouraging action plan with specific numbers from the data. Avoid generic advice.

STRICT RULES:
- ${langInstruction}
- Maximum 150 words total. Do NOT exceed 150 words.
- Keep it concise, structured, and actionable.

Student data:
${JSON.stringify(studentData, null, 2)}`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          }),
        },
      );
      if (!res.ok) {
        const errText = await res.text();
        return { ok: false as const, error: `Gemini API error: ${res.status} ${errText}`, hash: dataHash, data: studentData };
      }
      const json = await res.json();
      let text =
        json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      if (!text) {
        return { ok: false as const, error: "Empty response from Gemini", hash: dataHash, data: studentData };
      }
      // Hard cap at 150 words as a safety net
      const words = text.trim().split(/\s+/);
      if (words.length > 150) text = words.slice(0, 150).join(" ") + "…";
      return { ok: true as const, unchanged: false as const, analysis: text, hash: dataHash, data: studentData };
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI request failed";
      return { ok: false as const, error: message, hash: dataHash, data: studentData };
    }
  });
