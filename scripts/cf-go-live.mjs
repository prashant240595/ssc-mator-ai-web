// Put sscmentorai.online on the Cloudflare Worker (the only step that cannot be
// automated is changing nameservers at the registrar — BigRock).
//
// Usage:
//   node scripts/cf-go-live.mjs            # report state + do everything possible
//   node scripts/cf-go-live.mjs --attach   # only attach custom domains to the Worker
//
// Auth: CLOUDFLARE_API_TOKEN from .env / the shell, or the OAuth token that
// `npx wrangler login` already stored locally.
//
// Zone creation and DNS edits need a token with Zone:Edit + DNS:Edit. The
// wrangler OAuth token only has zone:read, so if the zone is missing the script
// prints the two dashboard clicks instead of failing silently.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOMAIN = "sscmentorai.online";
const WWW = `www.${DOMAIN}`;
const SCRIPT = "ssc-mentor-ai";
const ENVIRONMENT = "production";
const ATTACH_ONLY = process.argv.includes("--attach");

function loadDotEnv() {
  const file = join(root, ".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!m) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function loadToken() {
  loadDotEnv();
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;

  const cfg = join(homedir(), "AppData", "Roaming", "xdg.config", ".wrangler", "config", "default.toml");
  if (existsSync(cfg)) {
    const token = readFileSync(cfg, "utf8").match(/^(?:oauth_token|access_token)\s*=\s*"([^"]+)"/m)?.[1];
    if (token) return token;
  }
  console.error("No Cloudflare credentials. Run `npx wrangler login` or set CLOUDFLARE_API_TOKEN.");
  process.exit(1);
}

const token = loadToken();

async function api(path, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: json.success === true, errors: json.errors ?? [], result: json.result };
}

function describe(errors) {
  return errors.map((e) => `${e.code ?? "?"} ${e.message ?? ""}`).join("; ") || "unknown error";
}

const accounts = await api("/accounts?per_page=50");
if (!accounts.ok) {
  console.error(`Cannot list accounts: ${accounts.status} ${describe(accounts.errors)}`);
  process.exit(1);
}
const account = accounts.result[0];
if (!account) {
  console.error("This token has no accounts.");
  process.exit(1);
}
console.log(`Account: ${account.name} (${account.id})`);

// ---------------------------------------------------------------- zone lookup
let zone = (await api(`/zones?name=${DOMAIN}`)).result?.[0] ?? null;

if (!zone && !ATTACH_ONLY) {
  console.log(`\n${DOMAIN} is not in this Cloudflare account yet — creating it…`);
  const created = await api("/zones", {
    method: "POST",
    body: JSON.stringify({ name: DOMAIN, account: { id: account.id }, type: "full", jump_start: true }),
  });

  if (created.ok) {
    zone = created.result;
    console.log("Zone created.");
  } else {
    console.log(`Could not create it automatically (${created.status} ${describe(created.errors)}).`);
    console.log("\nDo this once in the dashboard:");
    console.log("  1. https://dash.cloudflare.com → Add a site → sscmentorai.online → Free plan");
    console.log("  2. Copy the two nameservers Cloudflare shows (e.g. kate.ns.cloudflare.com)");
    console.log("  3. BigRock → Manage Domain → Name Servers → replace dns1..dns4.bigrock.in");
    console.log("  4. Re-run: npm run cf:go-live");
    process.exit(2);
  }
}

if (zone) {
  console.log(`\nZone: ${zone.name} (${zone.id}) status=${zone.status}`);
  const ns = zone.name_servers ?? [];
  if (ns.length) {
    console.log("\nNameservers to set at BigRock (replace the bigrock.in ones):");
    for (const n of ns) console.log(`  ${n}`);
    console.log("BigRock → Manage Domain → Name Servers → custom nameservers.");
  }
  if (zone.status !== "active") {
    console.log(`\nZone is "${zone.status}" — nameserver change is still pending.`);
    console.log("DNS propagation is usually minutes, worst case 24h. Re-run after it turns active.");
  }
}

// ------------------------------------------------------- attach custom domains
if (!zone) {
  console.log("\nNo zone — skipping custom-domain attach.");
  process.exit(0);
}

// A Worker custom domain cannot be attached while an A/AAAA/CNAME already owns
// the hostname. Adding the site imports the old Lovable A record, so that has to
// go first — otherwise Cloudflare answers 409 and the domain keeps pointing at
// Lovable. Deleting needs DNS:Edit; the wrangler OAuth token only has zone:read,
// in which case the exact record to delete is printed instead.
async function clearConflicts(zoneId, hostname) {
  const listed = await api(`/zones/${zoneId}/dns_records?name=${hostname}&per_page=50`);
  if (!listed.ok) return { cleared: true, records: [] };

  const records = (listed.result ?? []).filter((r) => ["A", "AAAA", "CNAME"].includes(r.type));
  if (records.length === 0) return { cleared: true, records };

  for (const record of records) {
    const del = await api(`/zones/${zoneId}/dns_records/${record.id}`, { method: "DELETE" });
    if (!del.ok) {
      console.log(
        `\n${hostname}: ${record.type} ${record.name} → ${record.content} blocks the attach ` +
          `(${del.status} ${describe(del.errors)}).`,
      );
      console.log("  Delete it in the dashboard: DNS → Records → the row above → Delete.");
      return { cleared: false, records };
    }
    console.log(`\n${hostname}: deleted stale ${record.type} record → ${record.content}`);
  }
  return { cleared: true, records };
}

const existing = await api(`/accounts/${account.id}/workers/domains?per_page=100`);
const attached = new Set((existing.result ?? []).map((d) => d.hostname));

for (const hostname of [DOMAIN, WWW]) {
  if (attached.has(hostname)) {
    console.log(`\n${hostname}: already attached`);
    continue;
  }

  const { cleared } = await clearConflicts(zone.id, hostname);
  if (!cleared) continue;

  const res = await api(`/accounts/${account.id}/workers/domains`, {
    method: "POST",
    body: JSON.stringify({
      zone_id: zone.id,
      hostname,
      service: SCRIPT,
      environment: ENVIRONMENT,
    }),
  });
  if (res.ok) {
    console.log(`\n${hostname}: attached to ${SCRIPT} (certificate issued automatically)`);
  } else {
    console.log(`\n${hostname}: attach failed (${res.status} ${describe(res.errors)})`);
    console.log("  Fallback: Worker → Settings → Domains & Routes → Add custom domain");
  }
}

// ------------------------------------------------------------------- verify
if (zone.status === "active") {
  console.log("\nVerifying over HTTPS…");
  for (const url of [`https://${DOMAIN}/`, `https://${WWW}/`]) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      const location = res.headers.get("location");
      console.log(`  ${url} → ${res.status}${location ? ` → ${location}` : ""}`);
    } catch (error) {
      console.log(`  ${url} → ${error.message}`);
    }
  }
}
