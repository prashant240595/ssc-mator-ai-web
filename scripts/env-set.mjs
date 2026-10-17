// Put a value into a key in .env, preserving comments and other lines.
// Reports only a redacted preview, never the secret itself.
import { readFileSync, writeFileSync } from "node:fs";

const [key, ...rest] = process.argv.slice(2);
const value = rest.join(" ");

if (!key || !value) {
  console.error("usage: node scripts/env-set.mjs <KEY> <value>");
  process.exit(1);
}

const path = ".env";
let text = readFileSync(path, "utf8");
const line = `${key}="${value}"`;
const re = new RegExp(`^${key}=.*$`, "m");

if (re.test(text)) text = text.replace(re, line);
else text = `${text.replace(/\n*$/, "\n")}${line}\n`;

writeFileSync(path, text);

const stored = new RegExp(`^${key}="?([^"\\n]*)"?`, "m").exec(text)?.[1] ?? "";
const mask = stored.length <= 12 ? `(${stored.length} chars)` : `${stored.slice(0, 6)}…${stored.slice(-4)} (${stored.length})`;
console.log(`${key.padEnd(28)} ${mask}`);
console.log(`\n.env updated (${path} is gitignored)`);