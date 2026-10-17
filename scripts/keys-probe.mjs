// Test the three Supabase keys against the real project, before committing them
// to .env. Read-only. Prints redacted key identifiers only.
const ref = process.argv[2] ?? "djvywlfkwtakkbagksgh";
const publishable = process.argv[3];
const serviceJwt = process.argv[4];

const url = `https://${ref}.supabase.co`;
const mask = (s) => `${s.slice(0, 8)}…${s.slice(-4)}`;

async function probe(label, key, extra = {}) {
  const t = Date.now();
  try {
    const res = await fetch(`${url}/rest/v1/question_bank?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "count=exact",
        ...extra,
      },
      signal: AbortSignal.timeout(15000),
    });
    const count = res.headers.get("content-range")?.split("/")[1] ?? "?";
    const body = res.ok ? "" : (await res.text()).slice(0, 90);
    console.log(`${label.padEnd(22)} HTTP ${res.status}  ${String(Date.now() - t).padStart(5)}ms  rows=${count}  ${body}`);
    return res.ok;
  } catch (e) {
    console.log(`${label.padEnd(22)} FAILED  ${e.message}`);
    return false;
  }
}

console.log(`project: ${ref}\n`);
await probe("publishable (anon)", publishable);
await probe("service_role", serviceJwt);

// What the publishable key cannot see is the real test of RLS.
for (const table of ["profiles", "student_results", "payment_orders", "subscriptions"]) {
  try {
    const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
      headers: {
        apikey: serviceJwt,
        Authorization: `Bearer ${serviceJwt}`,
        Prefer: "count=exact",
      },
      signal: AbortSignal.timeout(15000),
    });
    const count = res.headers.get("content-range")?.split("/")[1] ?? "?";
    console.log(`${`service→ ${table}`.padEnd(22)} HTTP ${res.status}  rows=${count}`);
  } catch (e) {
    console.log(`${`service→ ${table}`.padEnd(22)} FAILED  ${e.message}`);
  }
}