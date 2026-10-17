// Is the ENOTFOUND specific to this Supabase project, or is *.supabase.co not
// resolving at all from here? Compares the real ref against known-good refs.
import { Resolver } from "node:dns/promises";

const refs = [
  process.argv[2] ?? "fjpmohfovknezctoqdew",
  // Supabase's own public project, used as a control.
  "mfxzsupabase",
  "abcdefghijklmnop",
];

function lookupVia(server, host) {
  const r = new Resolver();
  r.setServers([server]);
  return r.resolve4(host).then((a) => a.join(", ")).catch((e) => `FAIL ${e.code}`);
}

for (const ref of refs) {
  const host = `${ref}.supabase.co`;
  const google = await lookupVia("8.8.8.8", host);
  const cloudflare = await lookupVia("1.1.1.1", host);
  console.log(`${host}\n   via 8.8.8.8 : ${google}\n   via 1.1.1.1 : ${cloudflare}\n`);
}

// Also try reaching Supabase's API over a host that must exist, to confirm the
// machine has working outbound HTTPS at all.
try {
  const res = await fetch("https://api.supabase.com/v1/projects", {
    signal: AbortSignal.timeout(10000),
  });
  console.log(`api.supabase.com reachable → HTTP ${res.status} (expected 401 without a token)`);
} catch (e) {
  console.log(`api.supabase.com → ${e.message}${e.cause?.code ? ` (${e.cause.code})` : ""}`);
}