// Which built server modules import a given lib chunk? Used to find why
// browser-only libraries end up in the SSR bundle.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = ".output/server";
const targets = process.argv.slice(2);

const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".mjs")) files.push(full);
  }
}
walk(root);

for (const t of targets) {
  const importers = files.filter((f) => {
    if (f.endsWith(`/${t}.mjs`)) return false;
    return new RegExp(`["'][^"']*${t}\\.mjs["']`).test(readFileSync(f, "utf8"));
  });
  console.log(`\n== ${t} imported by ${importers.length} module(s):`);
  for (const f of importers.slice(0, 12)) {
    console.log(`   ${f.replace(/\\/g, "/")}  (${(statSync(f).size / 1024).toFixed(0)} KB)`);
  }
}
