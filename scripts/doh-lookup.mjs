// Ask a public DNS-over-HTTPS resolver for the project's address. DoH goes
// straight to the resolver over HTTPS, so it bypasses whatever the local
// network's DNS is doing. If DoH answers but the system resolver does not, the
// project exists and the problem is local DNS.
import { readFileSync } from "node:fs";
import { lookup } from "node:dns/promises";

const env = {};
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "");
}

const ref = env.SUPABASE_PROJECT_ID;
const host = `${ref}.supabase.co`;

console.log(`querying DoH for ${host}\n`);

const endpoints = [
  ["Cloudflare", `https://cloudflare-dns.com/dns-query?name=${host}&type=A`, { accept: "application/dns-json" }],
  ["Google", `https://dns.google/resolve?name=${host}&type=A`, {}],
];

for (const [label, url, headers] of endpoints) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    const json = await res.json();
    const answers = (json.Answer ?? []).map((a) => `${a.type} ${a.data}`);
    const status = json.Status;
    const meaning = { 0: "NOERROR (exists)", 3: "NXDOMAIN (does not exist)" }[status] ?? `status ${status}`;
    console.log(`${label}:`);
    console.log(`   status: ${meaning}`);
    for (const a of answers) console.log(`   ${a}`);
    if (!answers.length) console.log("   (no A records)");
  } catch (e) {
    console.log(`${label}: request failed — ${e.message}`);
  }
  console.log("");
}

try {
  const r = await lookup(host);
  console.log(`system resolver: OK -> ${r.address}`);
} catch (e) {
  console.log(`system resolver: FAIL -> ${e.code}`);
}