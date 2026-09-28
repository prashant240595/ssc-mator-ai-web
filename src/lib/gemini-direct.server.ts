/**
 * Direct Google Gemini API client (uses the project's own GEMINI_API_KEY).
 * Billing goes to Google, NOT to Lovable AI credits.
 */

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export class GeminiQuotaError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GeminiQuotaError";
    this.status = status;
  }
}

export async function geminiChat(opts: {
  messages: ChatMsg[];
  model?: string;
  maxTokens?: number;
  json?: boolean;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const model = opts.model ?? "gemini-2.5-flash";
  const systemText = opts.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const contents = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = { contents };
  if (systemText) body["systemInstruction"] = { parts: [{ text: systemText }] };
  const genCfg: Record<string, unknown> = {};
  if (opts.maxTokens) genCfg["maxOutputTokens"] = opts.maxTokens;
  if (opts.json) genCfg["responseMimeType"] = "application/json";
  if (Object.keys(genCfg).length) body["generationConfig"] = genCfg;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const t = await res.text();
    // 429 = quota exhausted, 403 = key blocked/disabled
    if (res.status === 429 || res.status === 403) {
      throw new GeminiQuotaError(res.status, `Gemini ${res.status}: ${t.slice(0, 200)}`);
    }
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`);
  }

  const json: any = await res.json();
  const text: string =
    json?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("")
      .trim() ?? "";
  return text;
}
