// Enable the workers.dev route for a deployed script. A Worker can be uploaded
// and still serve nothing if `enabled` is false — every request then hits
// Cloudflare's default 404 page rather than the Worker.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const accountId = "ee4895a5387a1bcc0aae05ff4a9f6f52";
const script = process.argv[2] ?? "ssc-mentor-ai";
const cfgDir = join(homedir(), "AppData", "Roaming", "xdg.config", ".wrangler", "config");

function readToken() {
  const file = join(cfgDir, "default.toml");
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8");
  return text.match(/^(?:oauth_token|access_token|token)\s*=\s*"([^"]+)"/m)?.[1] ?? null;
}

const token = readToken();
if (!token) {
  console.log("no OAuth token found — run `npx wrangler login`");
  process.exit(1);
}

const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${script}`;
const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

const before = await (await fetch(`${base}/subdomain`, { headers: auth })).json();
console.log(`before: ${JSON.stringify(before.result)}`);

if (before.result?.enabled === true) {
  console.log("already enabled");
  process.exit(0);
}

const res = await fetch(`${base}/subdomain`, {
  method: "PUT",
  headers: auth,
  body: JSON.stringify({ enabled: true, previews_enabled: true }),
});
const json = await res.json();

console.log(`PUT  HTTP ${res.status}  success=${json.success}`);
if (!json.success) console.log(`  ${JSON.stringify(json.errors).slice(0, 300)}`);

const after = await (await fetch(`${base}/subdomain`, { headers: auth })).json();
console.log(`after:  ${JSON.stringify(after.result)}`);

const sub = after.result?.subdomain ?? "prashantsingh-240567";
console.log(`\nlive URL should be: https://${script}.${sub}.workers.dev`);