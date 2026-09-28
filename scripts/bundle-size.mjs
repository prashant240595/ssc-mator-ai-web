// Report the largest files inside the built Worker bundle, so we can see what is
// inflating the deploy size against Cloudflare's 3 MB compressed limit.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? ".output/server";
const limit = Number(process.argv[3] ?? 25);

function dirSize(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    total += entry.isDirectory() ? dirSize(full) : statSync(full).size;
  }
  return total;
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push([full.slice(root.length + 1), statSync(full).size]);
  }
  return out;
}

const files = walk(root).sort((a, b) => b[1] - a[1]);

for (const [name, size] of files.slice(0, limit)) {
  console.log(`${(size / 1024).toFixed(0).padStart(8)} KB  ${name}`);
}
console.log(`\n${files.length} files, ${(dirSize(root) / 1048576).toFixed(2)} MB total  (${root})`);
