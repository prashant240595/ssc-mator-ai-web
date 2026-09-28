// Sample the public content tables so we can see what data already exists.
// Read-only, uses the publishable key from .env.
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "");
}

const headers = {
  apikey: env.SUPABASE_PUBLISHABLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`,
};

async function get(path) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { headers });
  if (!res.ok) return { error: `${res.status} ${(await res.text()).slice(0, 120)}` };
  return { data: await res.json() };
}

function tally(rows, key) {
  const out = {};
  for (const row of rows) {
    const k = row[key] ?? "(null)";
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function top(counts, n = 10) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => `  ${String(v).padStart(5)}  ${k}`);
}

const q = await get("question_bank?select=subject,exam_name&limit=2000");
if (q.error) {
  console.log("question_bank:", q.error);
} else {
  console.log(`question_bank — ${q.data.length} rows sampled`);
  console.log(" by subject:");
  console.log(top(tally(q.data, "subject"), 12).join("\n"));
  console.log(" by exam:");
  console.log(top(tally(q.data, "exam_name"), 8).join("\n"));
}

const b = await get("blog_posts?select=title,published_at&order=published_at.desc&limit=5");
if (!b.error) {
  console.log("\nlatest 5 blog posts:");
  for (const p of b.data) console.log(`  ${(p.published_at ?? "").slice(0, 10)}  ${p.title}`);
}

const d = await get("daily_quizzes?select=quiz_date&order=quiz_date.desc&limit=3");
if (!d.error) {
  console.log("\nlatest daily quizzes:");
  for (const q2 of d.data) console.log(`  ${String(q2.quiz_date).slice(0, 10)}`);
}
