// Confirm the empty-reply behaviour of gemini-2.5-flash at different
// maxOutputTokens budgets, so we know whether the app's AI partner/group mentor
// limits (200 / 300) will produce blank replies.
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "");
}

const key = env.GEMINI_API_KEY;
const prompt = "Reply with one word: ok";

for (const max of [8, 200, 300, 512, 1024, 4096]) {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: max },
      }),
      signal: AbortSignal.timeout(30000),
    },
  );

  if (!res.ok) {
    console.log(`maxOutputTokens=${String(max).padEnd(5)} HTTP ${res.status}`);
    continue;
  }

  const j = await res.json();
  const cand = j?.candidates?.[0];
  const text = cand?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
  const finish = cand?.finishReason ?? "?";
  const thoughts = j?.usageMetadata?.thoughtsTokenCount;
  console.log(
    `maxOutputTokens=${String(max).padEnd(5)} finish=${String(finish).padEnd(8)} ` +
      `thoughts=${thoughts ?? "-"}  reply=${text ? JSON.stringify(text.slice(0, 30)) : "*** EMPTY ***"}`,
  );
}