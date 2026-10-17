// Does the publishable key in .env belong to a given project ref?
// The key is a JWT whose `ref` claim names its project, so we can compare that
// against the ref we think we are pointing at.
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "");
}

const target = process.argv[2];
const key = env.SUPABASE_PUBLISHABLE_KEY;

if (!key) {
  console.log("no publishable key in .env");
  process.exit(1);
}

const claims = JSON.parse(Buffer.from(key.split(".")[1], "base64").toString());

console.log(`key ref     ${claims.ref}`);
console.log(`URL ref     ${(/https:\/\/([a-z0-9]+)\.supabase\.co/.exec(env.SUPABASE_URL) ?? [])[1]}`);
console.log(`.env id     ${env.SUPABASE_PROJECT_ID}`);
if (target) {
  console.log(`target      ${target}`);
  console.log(`\nkey matches target: ${claims.ref === target ? "YES" : "NO"}`);
  console.log(`URL matches target: ${/https:\/\/([a-z0-9]+)\.supabase\.co/.exec(env.SUPABASE_URL)?.[1] === target ? "YES" : "NO"}`);
}
console.log(`\nrole ${claims.role}, issued ${new Date(claims.iat * 1000).toISOString()}, expires ${new Date(claims.exp * 1000).toISOString()}`);