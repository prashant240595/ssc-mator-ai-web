// Live-test GEMINI_API_KEY against the real API with the cheapest possible
// request (fewest output tokens), so we know whether AI features will work.
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
if (!key) {
  console.log("GEMINI_API_KEY is empty in .env");
  process.exit(1);
}

const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-3.5-flash-lite",
  "gemini-3.1-pro-preview",
];

console.log(`key length ${key.length}\n`);

for (const model of MODELS) {
  const t = Date.now();
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Reply with the single word: ok" }] }],
          generationConfig: { maxOutputTokens: 8 },
        }),
        signal: AbortSignal.timeout(25000),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      const msg = /"message":\s*"([^"]+)"/.exec(err)?.[1] ?? err.slice(0, 160);
      console.log(`${model.padEnd(24)} HTTP ${res.status}  ${msg}`);
      continue;
    }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    console.log(`${model.padEnd(24)} HTTP 200  ${Date.now() - t}ms  replied: ${JSON.stringify(text.trim().slice(0, 40))}`);
  } catch (e) {
    console.log(`${model.padEnd(24)} FAILED  ${e.message}`);
  }
}