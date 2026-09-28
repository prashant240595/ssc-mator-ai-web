// Find which source files import the heavy browser-only libraries, so we can see
// why they are ending up in the server (SSR) bundle.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const libs = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["mermaid", "katex", "react-katex", "cytoscape", "recharts", "pdf-lib", "posthog"];

const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
}
walk("src");

for (const lib of libs) {
  const re = new RegExp(
    `(?:from\\s*|import\\s*\\(|require\\s*\\()\\s*["'][^"']*${lib}[^"']*["']`,
    "i",
  );
  const hits = [];
  for (const file of files) {
    const code = readFileSync(file, "utf8");
    if (!re.test(code)) continue;
    const static_ = new RegExp(`^import[^;]*from\\s*["'][^"']*${lib}`, "im").test(code);
    const dynamic = new RegExp(`import\\s*\\([^)]*${lib}`, "i").test(code);
    hits.push(`${relative(".", file).replace(/\\/g, "/")}  [${static_ ? "static" : dynamic ? "dynamic" : "?"}]`);
  }
  console.log(`\n${lib} — ${hits.length} file(s)`);
  for (const h of hits) console.log(`  ${h}`);
}
