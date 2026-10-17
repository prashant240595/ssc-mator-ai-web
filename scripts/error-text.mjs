// Print the visible text of a failing page so we can read the actual error.
const base = process.env.SSC_BASE ?? "http://localhost:8080";
const path = process.argv[2] ?? "/";

const res = await fetch(base + path);
const html = await res.text();
const text = html
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&[a-z#0-9]+;/gi, " ")
  .replace(/\s+/g, " ")
  .trim();

console.log(`${path} → HTTP ${res.status} (${html.length} bytes)\n`);
console.log(text.slice(0, Number(process.argv[3] ?? 1500)));