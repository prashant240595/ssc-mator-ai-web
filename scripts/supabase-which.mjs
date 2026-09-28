// Which Supabase project is this workspace pointed at, and is it reachable?
// Prints project refs found in local config and probes the live REST endpoint.
import { readFileSync, existsSync, readdirSync } from "node:fs";

const REF_RE = /\b([a-z0-9]{20})\b/;

const sources = [".env", "supabase/config.toml"];
for (const f of sources) {
  if (!existsSync(f)) {
    console.log(`${f.padEnd(24)} (missing)`);
    continue;
  }
  const text = readFileSync(f, "utf8");
  const refs = [...new Set([...text.matchAll(new RegExp(REF_RE, "g"))].map((m) => m[1]))];
  const url = /https:\/\/([a-z0-9]+)\.supabase\.co/.exec(text)?.[1];
  console.log(`${f.padEnd(24)} ${url ? `url=${url}` : ""} ${refs.length ? `refs=${refs.join(",")}` : ""}`);
}

console.log("\nsupabase/ tree:");
if (existsSync("supabase")) {
  const walk = (dir, depth = 0) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) {
        console.log(`${"  ".repeat(depth + 1)}${e.name}/  (${readdirSync(p).length} entries)`);
        if (depth < 1) walk(p, depth + 1);
      }
    }
  };
  walk("supabase");
}

const env = {};
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "");
}

if (env.SUPABASE_URL) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}` },
  });
  console.log(`\nlive ${env.SUPABASE_URL}\n  REST root → HTTP ${res.status} ${res.ok ? "(reachable)" : "(unreachable)"}`);
  console.log(`  service_role key in .env: ${env.SUPABASE_SERVICE_ROLE_KEY ? "yes" : "no"}`);
}
