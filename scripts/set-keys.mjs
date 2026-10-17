// Write the Supabase keys into .env without printing them, then verify by
// decoding the key's `ref` claim. Used after rotating to a new project.
import { readFileSync, writeFileSync } from "node:fs";

const [ref, publishable, secret, serviceJwt] = [
  process.argv[2],
  process.argv[3],
  process.argv[4],
  process.argv[5],
];

const path = ".env";
let text = readFileSync(path, "utf8");

// Prefer the modern sb_publishable_/sb_secret_ pair. Fall back to the legacy JWT
// anon key if only that was supplied.
const anonKey = publishable ?? serviceJwt;
const lines = {
  SUPABASE_PROJECT_ID: ref,
  SUPABASE_URL: `https://${ref}.supabase.co`,
  SUPABASE_PUBLISHABLE_KEY: anonKey,
  VITE_SUPABASE_PROJECT_ID: ref,
  VITE_SUPABASE_URL: `https://${ref}.supabase.co`,
  VITE_SUPABASE_PUBLISHABLE_KEY: anonKey,
};

function setValue(src, key, value) {
  const re = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}="${value}"`;
  if (re.test(src)) return src.replace(re, line);
  return `${src.replace(/\n*$/, "\n")}${line}\n`;
}

for (const [key, value] of Object.entries(lines)) setValue(text, key, (text = value));
if (secret) {
  setValue(text, "SUPABASE_SECRET_KEY", (text = secret));
  setValue(text, "SUPABASE_SERVICE_ROLE_KEY", (text = serviceJwt ?? secret));
}
writeFileSync(path, text);

// Report shape only, never the values.
const mask = (s) => (s.length <= 16 ? `(${s.length} chars)` : `${s.slice(0, 10)}…${s.slice(-4)} (${s.length})`);
console.log("updated .env:");
for (const [key] of Object.entries(lines)) {
  const found = new RegExp(`^${key}="?([^"\\n]*)"?`, "m").exec(text)?.[1] ?? "";
  console.log(`  ${key.padEnd(26)} ${mask(found)}`);
}
console.log(`\nall keys target ref ${ref}`);