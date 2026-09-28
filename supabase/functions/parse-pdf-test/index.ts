// Edge Function: parse-pdf-test
// Extracts SSC questions from an uploaded PDF using Lovable AI Gateway (Gemini multimodal),
// translates them to Hindi, formats into our dual-language schema, and inserts into question_bank.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "prashant.singh.2405@gmail.com";

const SYSTEM_PROMPT = `You are an expert SSC CGL exam content extractor and translator.

You will receive a PDF containing SSC-style multiple choice questions. Do the following:

1. EXTRACT every question with: question text, all options (typically 4), the correct answer (0-indexed), explanation, subject, and topic.
2. CLASSIFY subject as one of: "quant", "reasoning", "ga", "english".
3. TRANSLATE every English text field (question, options, explanation, topic) into accurate Hindi suitable for SSC aspirants.
4. DIAGRAMS / FIGURES (Venn diagrams, dice, circles, geometric figures, charts):
   - PREFERRED: Generate clean, self-contained inline SVG markup (no external refs, width/height set, viewBox present) that faithfully represents the diagram, and put it in "image_svg".
   - FALLBACK: If the diagram cannot be reproduced as SVG (e.g. a photo), leave "image_svg" null and put a short description in "image_description" so the caller can crop it.
5. Return ONLY a single JSON object of the exact shape:

{
  "questions": [
    {
      "subject": "quant" | "reasoning" | "ga" | "english",
      "topic": { "en": "...", "hi": "..." },
      "text": { "en": "...", "hi": "..." },
      "options": [
        { "en": "...", "hi": "..." },
        { "en": "...", "hi": "..." },
        { "en": "...", "hi": "..." },
        { "en": "...", "hi": "..." }
      ],
      "correct": 0,
      "explanation": { "en": "...", "hi": "..." },
      "image_svg": null,
      "image_description": null,
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}

No markdown. No prose. JSON only.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY not configured" }, 500);
    }

    // Verify caller is admin via their JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user || userData.user.email?.toLowerCase() !== ADMIN_EMAIL) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { storage_path } = await req.json();
    if (!storage_path || typeof storage_path !== "string") {
      return json({ error: "storage_path is required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Download the PDF
    const { data: blob, error: dlErr } = await admin.storage
      .from("admin-pdf-uploads")
      .download(storage_path);
    if (dlErr || !blob) {
      return json({ error: `Failed to download PDF: ${dlErr?.message}` }, 500);
    }
    const arrayBuf = await blob.arrayBuffer();
    const base64Pdf = arrayBufferToBase64(arrayBuf);

    // 2. Call Lovable AI Gateway with Gemini (multimodal — accepts PDF)
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract and translate every question from this PDF." },
              {
                type: "file",
                file: {
                  filename: storage_path.split("/").pop() ?? "input.pdf",
                  file_data: `data:application/pdf;base64,${base64Pdf}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      if (aiRes.status === 429) return json({ error: "Rate limit exceeded. Try again shortly." }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted. Add credits in Settings." }, 402);
      return json({ error: `AI request failed: ${errText}` }, 500);
    }

    const aiJson = await aiRes.json();
    const content: string = aiJson.choices?.[0]?.message?.content ?? "";

    let parsed: { questions?: any[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to recover JSON inside the text
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) return json({ error: "AI did not return valid JSON", raw: content }, 500);
      parsed = JSON.parse(m[0]);
    }

    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    if (questions.length === 0) {
      return json({ error: "No questions extracted from PDF" }, 422);
    }

    // 3. Insert into question_bank
    const rows = questions.map((q: any) => ({
      subject: q.subject,
      topic: q.topic,
      text: q.text,
      options: q.options,
      correct: typeof q.correct === "number" ? q.correct : 0,
      explanation: q.explanation,
      image_svg: q.image_svg ?? null,
      image_url: null,
      source_pdf: storage_path,
      difficulty: q.difficulty ?? "medium",
      created_by: userData.user.id,
    }));

    const { data: inserted, error: insErr } = await admin
      .from("question_bank")
      .insert(rows)
      .select("id");

    if (insErr) {
      return json({ error: `DB insert failed: ${insErr.message}` }, 500);
    }

    return json({
      success: true,
      inserted: inserted?.length ?? 0,
      source_pdf: storage_path,
    });
  } catch (e: any) {
    console.error("parse-pdf-test error", e);
    return json({ error: e?.message ?? "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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
