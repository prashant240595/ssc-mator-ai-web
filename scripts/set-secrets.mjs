// Set Wrangler secrets from .env without ever printing the values.
// Reads .env, writes each listed key via `wrangler secret put`, feeding the
// value on stdin so it never appears in the command line or shell history.
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const env = {};
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "");
}

const keys = process.argv.slice(2);

if (!keys.length) {
  console.error("usage: node scripts/set-secrets.mjs NAME [NAME...]");
  process.exit(1);
}

function put(name, value) {
  return new Promise((resolve) => {
    // Invoke wrangler's JS entry point with our own Node rather than the .cmd
    // shim — shims cannot be spawned on Windows, and this also keeps the secret
    // value on stdin instead of the command line.
    const entry = join(root, "node_modules", "wrangler", "bin", "wrangler.js");
    const child = spawn(process.execPath, [entry, "secret", "put", name, "--config", "wrangler.jsonc"], {
      cwd: root,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let err = "";
    child.stdout.on("data", () => {});
    child.stderr.on("data", (c) => (err += c));
    child.on("close", (code) => resolve({ code, err }));
    child.stdin.end(`${value}\n`);
  });
}

for (const name of keys) {
  const value = env[name];
  if (!value) {
    console.log(`${name.padEnd(30)} SKIPPED — empty in .env`);
    continue;
  }
  const { code, err } = await put(name, value);
  if (code === 0) {
    console.log(`${name.padEnd(30)} set (${value.length} chars)`);
  } else {
    console.log(`${name.padEnd(30)} FAILED — ${err.split("\n").slice(-2).join(" ").slice(0, 120)}`);
  }
}