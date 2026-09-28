// Find hard-coded domains and the site's own URL so we can update them for a
// custom domain. Reads src/ and public/.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PATTERN = /lovable\.app|localhost:\d+|ssc-ai-mentor|sscmentorai|workers\.dev|127\.0\.0\.1/g;
const roots = ["src", "public"];

const files = [];
function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(ts|tsx|css|html|json|txt)$/.test(e.name)) files.push(full);
  }
}
for (const r of roots) {
  try {
    walk(r);
  } catch {}
}

let total = 0;
for (const file of files) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    PATTERN.lastIndex = 0;
    if (!PATTERN.test(line)) return;
    const hits = [...new Set((line.match(PATTERN) ?? []))].join(", ");
    console.log(`${file.replace(/\\/g, "/")}:${i + 1}  [${hits}]  ${line.trim().slice(0, 100)}`);
    total++;
  });
}
console.log(`\n${total} line(s) reference a domain or host.`);
