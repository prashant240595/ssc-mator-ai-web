// Retry a Supabase REST request a few times to distinguish a transient network
// blip from a real outage.
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "");
}

const url = env.SUPABASE_URL;
const key = env.SUPABASE_PUBLISHABLE_KEY;
const table = process.argv[2] ?? "blog_posts";
const attempts = Number(process.argv[3] ?? 3);

for (let i = 1; i <= attempts; i++) {
  const t = Date.now();
  try {
    const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    });
    console.log(`try ${i}: HTTP ${res.status} in ${Date.now() - t}ms`);
  } catch (e) {
    const cause = e.cause?.message ?? e.cause?.code ?? "";
    console.log(`try ${i}: FAILED in ${Date.now() - t}ms — ${e.message}${cause ? ` (${cause})` : ""}`);
  }
  if (i < attempts) await new Promise((r) => setTimeout(r, 2000));
}