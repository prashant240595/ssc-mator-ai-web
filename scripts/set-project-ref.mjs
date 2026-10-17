import { readFileSync, writeFileSync } from "node:fs";

// Point every project ref in .env at `ref`, preserving order, quoting style and
// surrounding comments.
const ref = process.argv[2];
if (!ref || !/^[a-z0-9]{20}$/.test(ref)) {
  console.error("usage: node scripts/set-project-ref.mjs <20-char-project-ref>");
  process.exit(1);
}

const path = ".env";
const before = readFileSync(path, "utf8");

const after = before
  .replace(/(SUPABASE_PROJECT_ID|VITE_SUPABASE_PROJECT_ID)=("?)[^"\n]*\2/g, `$1="${ref}"`)
  .replace(/(SUPABASE_URL|VITE_SUPABASE_URL)=("?)https:\/\/[a-z0-9]+\.supabase\.co\2/g, `$1="https://${ref}.supabase.co"`);

if (after === before) {
  console.log("no changes made — no ref/URL lines found");
  process.exit(1);
}

writeFileSync(path, after);

for (const line of after.split(/\r?\n/)) {
  if (!line.trim() || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  const key = line.slice(0, i);
  const value = line.slice(i + 1);
  const shown = /KEY/.test(key) ? `${value.slice(0, 16)}… (${value.length} chars)` : value;
  console.log(`${key.padEnd(26)} ${shown}`);
}
console.log(`\nupdated ${path} → ${ref}`);