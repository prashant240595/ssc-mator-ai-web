// gemini-2.5-flash replies with an EMPTY string when maxOutputTokens is tiny,
// because the model spends budget on internal "thinking" before answering.
//
// Verified live via scripts/gemini-budget-test.mjs:
//   maxOutputTokens=8    -> finish=MAX_TOKENS, reply EMPTY
//   maxOutputTokens=200  -> fine
//   maxOutputTokens=300  -> fine
// Thinking costs ~16-22 tokens, so anything at or above ~64 is safe. Only flag
// limits that would starve the thinking budget — an earlier version of this
// script flagged 200/300 as too low, which the live test disproved.
const SAFE_MIN = 64;
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    if (e.isDirectory()) walk(f);
    else if (/\.(ts|tsx)$/.test(e.name)) files.push(f);
  }
})("src");

const hits = [];
for (const file of files) {
  const src = readFileSync(file, "utf8");
  // geminiChat({ ... maxTokens: N ... })
  const re = /geminiChat\s*\(\s*\{([\s\S]{0,600}?)\}\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    const body = m[1];
    const model = /model:\s*["'`]([^"'`]+)/.exec(body)?.[1] ?? "(default 2.5-flash)";
    const tokens = /maxTokens:\s*(\d+)/.exec(body)?.[1] ?? "(none)";
    const json = /\bjson:\s*true/.test(body) ? "json" : "text";
    hits.push({ file: file.replace(/\\/g, "/"), model, tokens, json });
  }
}

console.log(`geminiChat call sites: ${hits.length}\n`);
for (const h of hits) {
  const flag = h.tokens === "(none)" ? "" : Number(h.tokens) < SAFE_MIN ? "  ← TOO LOW, likely empty reply" : "";
  console.log(`  ${h.file}`);
  console.log(`    model=${h.model}  maxTokens=${h.tokens}  ${h.json}${flag}`);
}

if (hits.length === 0) console.log("  (no explicit maxTokens found — calls rely on the API default)");