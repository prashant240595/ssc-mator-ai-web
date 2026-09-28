// Summarise the built static output: how many files and bytes Cloudflare will
// serve from the edge (free, unlimited) versus the Worker bundle (quota-bound).
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else out.push([full, statSync(full).size]);
  }
  return out;
}

if (!existsSync(".output")) {
  console.log("No .output directory — run `npm run build` first.");
  process.exit(0);
}

const assets = walk(".output/public");
const server = walk(".output/server");

const sum = (rows) => rows.reduce((a, [, s]) => a + s, 0);
const kb = (b) => (b / 1024).toFixed(0);

console.log(`static assets (.output/public)  ${assets.length} files  ${kb(sum(assets))} KB`);
console.log(`worker bundle  (.output/server)  ${server.length} files  ${kb(sum(server))} KB`);

const big = assets.sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log(`\nlargest static assets:`);
for (const [path, size] of big) console.log(`  ${kb(size).padStart(7)} KB  ${path.replace(/\\/g, "/")}`);

console.log(`
On Cloudflare, static assets are uploaded once and served from the edge:
free, unlimited bandwidth, and they do NOT consume the 100k/day request quota.
Only requests that actually run the Worker (the HTML documents and API calls)
count against it.`);
