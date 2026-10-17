// List every Gemini model id referenced in src/, with a live availability check.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readFileSync as read } from "node:fs";

const env = {};
for (const line of read(".env", "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "");
}

const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    if (e.isDirectory()) walk(f);
    else if (/\.(ts|tsx)$/.test(e.name)) files.push(f);
  }
})("src");

const seen = new Map();
for (const file of files) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/gemini-[a-z0-9.-]+/g)) {
      const id = m[0];
      if (!seen.has(id)) seen.set(id, []);
      seen.get(id).push(`${file.replace(/\\/g, "/")}:${i + 1}`);
    }
  });
}

console.log("Gemini model ids found in src/:\n");
for (const [id, where] of seen) {
  let status = "";
  if (env.GEMINI_API_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${id}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
          // Enough output budget that a thinking model has room to actually answer.
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Reply with one word: ok" }] }],
            generationConfig: { maxOutputTokens: 2048 },
          }),
          signal: AbortSignal.timeout(30000),
        },
      );
      if (res.ok) {
        const j = await res.json();
        const txt = j?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
        status = txt ? `WORKS  (replied "${txt.slice(0, 20)}")` : "200 but empty reply";
      } else {
        const t = await res.text();
        const msg = /"message":\s*"([^"]+)"/.exec(t)?.[1] ?? t.slice(0, 90);
        status = `HTTP ${res.status} — ${msg}`;
      }
    } catch (e) {
      status = `FAILED — ${e.message}`;
    }
  }
  console.log(`${id}`);
  console.log(`  ${status}`);
  console.log(`  used in: ${where.join(", ")}\n`);
}