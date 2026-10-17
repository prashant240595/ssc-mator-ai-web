// Ask the Cloudflare API which workers.dev subdomain this account uses, so we
// stop guessing the hostname. Uses the OAuth token wrangler already stored.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const cfgDir = join(homedir(), "AppData", "Roaming", "xdg.config", ".wrangler", "config");
const accountId = "ee4895a5387a1bcc0aae05ff4a9f6f52";

function findToken() {
  if (!existsSync(cfgDir)) return null;
  const file = join(cfgDir, "default.toml");
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8");
  // Wrangler stores an OAuth access token; key name varies by version.
  const m = text.match(/^(?:oauth_token|access_token|token)\s*=\s*"([^"]+)"/m);
  return m?.[1] ?? null;
}

const token = findToken();
if (!token) {
  console.log(`could not read an OAuth token from ${cfgDir}`);
  console.log("run `npx wrangler login` first, or set CLOUDFLARE_API_TOKEN");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${token}` };

for (const [label, path] of [
  ["account subdomain", `/accounts/${accountId}/workers/subdomain`],
  ["subdomain (script)", `/accounts/${accountId}/workers/scripts/ssc-mentor-ai/subdomain`],
  ["worker triggers", `/accounts/${accountId}/workers/scripts/ssc-mentor-ai/triggers`],
]) {
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, { headers });
    const json = await res.json();
    console.log(`\n=== ${label} ===  HTTP ${res.status}`);
    if (json.success === false) {
      console.log(`  ${JSON.stringify(json.errors).slice(0, 300)}`);
      continue;
    }
    const result = json.result ?? {};
    console.log(`  ${JSON.stringify(result).slice(0, 600)}`);
  } catch (e) {
    console.log(`\n=== ${label} ===  FAILED  ${e.message}`);
  }
}