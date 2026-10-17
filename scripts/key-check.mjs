// Decode the Supabase key's JWT payload (no signature verification — we are only
// reading what it claims) and compare its project ref against SUPABASE_URL.
// Also probes DNS so we can tell "wrong ref" apart from "network problem".
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

function decodeJwt(token) {
  const [, payload] = token.split(".");
  return JSON.parse(Buffer.from(payload, "base64").toString());
}

const claims = decodeJwt(env.SUPABASE_PUBLISHABLE_KEY);
const urlRef = /https:\/\/([a-z0-9]+)\.supabase\.co/.exec(env.SUPABASE_URL)?.[1];

console.log("--- key claims ---");
for (const [k, v] of Object.entries(claims)) {
  console.log(`  ${k.padEnd(6)} ${v}`);
}
console.log(`\n  ref in key      ${claims.ref}`);
console.log(`  ref in URL      ${urlRef}`);
console.log(`  .env SUPABASE_PROJECT_ID  ${env.SUPABASE_PROJECT_ID}`);
console.log(`\n  match: ${claims.ref === urlRef && urlRef === env.SUPABASE_PROJECT_ID ? "YES — all identical" : "NO — MISMATCH"}`);
console.log(`  key role: ${claims.role}${claims.role === "anon" ? " (anonymous, cannot read RLS-protected tables)" : ""}`);
console.log(`  key issued: ${new Date(claims.iat * 1000).toISOString()}`);
console.log(`  key expires: ${new Date(claims.exp * 1000).toISOString()}`);

console.log("\n--- DNS ---");
for (const host of [`${claims.ref}.supabase.co`, `db.${claims.ref}.supabase.co`]) {
  try {
    const r = await lookup(host);
    console.log(`  OK     ${host} -> ${r.address}`);
  } catch (e) {
    console.log(`  FAIL   ${host} -> ${e.code}`);
  }
}