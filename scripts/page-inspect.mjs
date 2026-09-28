// Fetch a route and report what SSR actually rendered: title, whether common
// elements are present, and any error text. Helps confirm the page is really
// showing data rather than an empty shell.
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

const signals = [
  ["title", /<title>([^<]*)<\/title>/i.exec(html)?.[1] ?? null],
  ["h1", stripTags(/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1])],
  ["question text", /\b(Options|options|सही उत्तर|Correct answer)\b/i.test(text)],
  ["hindi text", /[\u0900-\u097F]/.test(text)],
  ["subjects listed", /(Quantitative|English|General Awareness|Intelligence)/i.test(text)],
  ["nav present", /<nav[\s>]/i.test(html)],
  ["error text", /(Something went wrong|Internal Server Error|500|Application error)/i.exec(text)?.[0] ?? null],
  ["empty body", text.length < 120],
];

console.log(`${path}  →  HTTP ${res.status}, ${html.length} bytes, ${text.length} chars of text\n`);
for (const [label, value] of signals) {
  const shown = value === null ? "no" : value === false ? "no" : value === true ? "yes" : String(value).slice(0, 70);
  console.log(`  ${label.padEnd(16)} ${shown}`);
}
console.log(`\n--- first 600 chars of visible text ---\n${text.slice(0, 600)}`);

function stripTags(s) {
  return s === undefined ? null : s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
