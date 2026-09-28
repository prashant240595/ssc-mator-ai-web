// Edge Function: parse-pdf-gemini
// Master Architecture: gemini-2.5-flash, overlapping 2-page chunks, bilingual enforcement,
// raw SVG only, watermark ignored. Returns validated question rows; frontend handles
// dedup and DB insert chunk-by-chunk.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "prashant.singh.2405@gmail.com";

const PROMPT = `You are a bilingual SSC CGL exam content expert (English + Hindi).

You are processing 2 OVERLAPPING pages from a larger PDF. Extract every complete multiple-choice question you can read. If a question is cut off at the very end of the chunk, IGNORE it — it will be caught in the next overlapping chunk.

For EACH question, return an object with this EXACT shape:

{
  "subject": "quant" | "reasoning" | "ga" | "english",
  "topic":       { "en": "<English topic>",       "hi": "<Hindi translation>" },
  "text":        { "en": "<English question>",    "hi": "<Hindi translation>" },
  "options": [
    { "en": "<Option A en>", "hi": "<Option A hi>" },
    { "en": "<Option B en>", "hi": "<Option B hi>" },
    { "en": "<Option C en>", "hi": "<Option C hi>" },
    { "en": "<Option D en>", "hi": "<Option D hi>" }
  ],
  "correct": <0-indexed integer of the correct option>,
  "explanation": { "en": "<English explanation>", "hi": "<Hindi translation>" },
  "image_svg": <raw <svg>...</svg> string OR null>,
  "difficulty": "easy" | "medium" | "hard"
}

CRITICAL RULES — follow ALL of these:
1. IGNORE WATERMARKS: Strictly ignore all background logos, watermarks, page headers/footers, and visual noise. They are NOT part of any question.
2. VISUAL FIRST: Look for question numbers (1, 2, 3, ...) and extract questions even from tables, boxes, multi-column layouts, or shaded regions.
3. BILINGUAL ENFORCEMENT: Every "en" and "hi" key MUST be populated. If the source is only in English, TRANSLATE accurately to Hindi to fill "hi". If the source is only in Hindi, translate to English to fill "en". NEVER leave "hi" or "en" null, empty, or identical to the other language (except for proper nouns / numerals).
4. RAW SVG ONLY: If a reasoning question contains geometric shapes, Venn diagrams, dice, or figures, return ONLY the raw <svg ...>...</svg> string in "image_svg" — self-contained, with viewBox, no scripts, no external refs. Do NOT wrap it in markdown fences like \`\`\`xml or \`\`\`svg. If no diagram exists, set "image_svg" to null.
5. OVERLAPPING CONTEXT: You are processing 2 overlapping pages. Extract all complete questions. If a question is cut off at the very end, ignore it; it will be caught in the next chunk.
6. Classify subject strictly as one of: "quant", "reasoning", "ga", "english".
7. Output MUST be valid JSON only — no markdown fences, no commentary.

Return a single JSON object: { "questions": [ ...array of question objects... ] }`;

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("Gemini API Key is missing in Edge Function secrets");
      return json({ error: "Gemini API Key is missing in Edge Function secrets" }, 500);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY =
      Deno.env.get("SUPABASE_ANON_KEY") ??
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      "";

    // --- Auth: admin only ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (
      userErr ||
      !userData.user ||
      userData.user.email?.toLowerCase() !== ADMIN_EMAIL
    ) {
      return json({ error: "Unauthorized — admin only" }, 401);
    }

    const { storage_path, test_series_id, chunk_index, total_chunks } = await req.json();
    if (!storage_path || typeof storage_path !== "string") {
      return json({ error: "storage_path is required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // --- 1. Download PDF from storage ---
    const { data: blob, error: dlErr } = await admin.storage
      .from("admin-pdf-uploads")
      .download(storage_path);
    if (dlErr || !blob) {
      return json({ error: `Failed to download PDF: ${dlErr?.message}` }, 500);
    }
    const base64Pdf = arrayBufferToBase64(await blob.arrayBuffer());

    // --- 2. Call Gemini 2.5 Flash ---
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: PROMPT },
              {
                inline_data: {
                  mime_type: "application/pdf",
                  data: base64Pdf,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          response_mime_type: "application/json",
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error", geminiRes.status, errText);
      const geminiMessage = getGeminiErrorMessage(errText);
      if (geminiRes.status === 429) {
        const retryAfterSeconds = getGeminiRetrySeconds(errText) ?? 60;
        return json(
          {
            error: `Gemini request failed (429): Quota exceeded. Please retry in ${retryAfterSeconds} seconds.`,
            detail: geminiMessage,
            retry_after_seconds: retryAfterSeconds,
            rate_limited: true,
          },
          429,
          { "Retry-After": String(retryAfterSeconds) },
        );
      }
      if (geminiRes.status === 503) {
        return json(
          {
            error: `Gemini request failed (503): Service overloaded. Retry in 120 seconds.`,
            detail: geminiMessage,
            retry_after_seconds: 120,
            overloaded: true,
          },
          503,
          { "Retry-After": "120" },
        );
      }
      return json(
        { error: `Gemini request failed (${geminiRes.status}): ${geminiMessage}`, detail: errText },
        geminiRes.status,
      );
    }

    const geminiJson = await geminiRes.json();
    const rawText: string =
      geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!rawText) {
      return json(
        { error: "Gemini returned empty content", raw: geminiJson },
        500,
      );
    }

    // --- 3. Parse JSON (with recovery) ---
    let parsed: { questions?: any[] };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) {
        return json(
          { error: "Malformed AI output — no JSON found", raw: rawText },
          422,
        );
      }
      try {
        parsed = JSON.parse(match[0]);
      } catch (e: any) {
        return json(
          { error: `Malformed AI JSON: ${e?.message}`, raw: rawText },
          422,
        );
      }
    }

    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

    // --- 4. Validate & shape rows (return to frontend, do NOT insert here) ---
    const validSubjects = new Set(["quant", "reasoning", "ga", "english"]);
    const rows: any[] = [];
    const skipped: any[] = [];

    for (const q of questions) {
      if (
        !q ||
        !validSubjects.has(q.subject) ||
        !q.text?.en ||
        !Array.isArray(q.options) ||
        q.options.length < 2 ||
        typeof q.correct !== "number"
      ) {
        skipped.push(q);
        continue;
      }
      rows.push({
        subject: q.subject,
        topic: q.topic ?? { en: "General", hi: "सामान्य" },
        text: q.text,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation ?? { en: "", hi: "" },
        image_svg: cleanSvg(q.image_svg),
        image_url: null,
        source_pdf: storage_path,
        difficulty: q.difficulty ?? "medium",
        created_by: userData.user.id,
        test_series_id: test_series_id ?? null,
      });
    }

    return json({
      success: true,
      questions: rows,
      extracted: rows.length,
      skipped: skipped.length,
      source_pdf: storage_path,
      chunk_index: chunk_index ?? null,
      total_chunks: total_chunks ?? null,
      test_series_id: test_series_id ?? null,
    });
  } catch (err: any) {
    console.error("parse-pdf-gemini exact error", err);
    return json({ error: err?.message ?? String(err) ?? "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...headers, "Content-Type": "application/json" },
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function cleanSvg(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/```(?:html|xml|svg)?/gi, "").replace(/```/g, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function getGeminiErrorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return parsed?.error?.message ?? raw;
  } catch {
    return raw;
  }
}

function getGeminiRetrySeconds(raw: string): number | null {
  try {
    const parsed = JSON.parse(raw);
    const retryDelay = parsed?.error?.details?.find((d: any) => d?.["@type"]?.includes("RetryInfo"))?.retryDelay;
    if (typeof retryDelay === "string") {
      const seconds = Number(retryDelay.replace("s", ""));
      return Number.isFinite(seconds) ? Math.max(60, seconds) : null;
    }
  } catch {
    return null;
  }
  return null;
}
