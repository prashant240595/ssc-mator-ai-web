// Quick connectivity + row-count probe against Supabase using the publishable
// key from .env. Read-only: it only issues `select=id&limit=1` HEAD-ish requests.
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
if (!url || !key) {
  console.error("SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY missing from .env");
  process.exit(1);
}

const tables = process.argv.slice(2);
const list = tables.length ? tables : ["question_bank", "profiles", "student_results", "blog_posts", "job_drafts"];

for (const table of list) {
  try {
    const res = await fetch(
      `${url}/rest/v1/${table}?select=*&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" } },
    );
    const cr = res.headers.get("content-range") ?? "";
    const count = cr.split("/")[1];
    const body = await res.text();
    if (!res.ok) {
      console.log(`${table.padEnd(22)} HTTP ${res.status}  ${body.slice(0, 120)}`);
    } else {
      console.log(`${table.padEnd(22)} ok  rows=${count}`);
    }
  } catch (e) {
    console.log(`${table.padEnd(22)} FAILED  ${e.message}`);
  }
}
