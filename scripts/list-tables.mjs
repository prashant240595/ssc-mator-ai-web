// Which tables actually exist in the project? The REST root lists exposed tables
// without auth on Supabase; fall back to OpenAPI if needed. Uses service_role so
// nothing is hidden behind RLS.
const ref = process.argv[2];
const key = process.argv[3];

const url = `https://${ref}.supabase.co`;
const auth = { apikey: key, Authorization: `Bearer ${key}` };

// The REST root returns the tables it exposes.
try {
  const res = await fetch(`${url}/rest/v1/`, { headers: auth });
  const text = await res.text();
  let names = [];
  try {
    const json = JSON.parse(text);
    names = Object.keys(json.paths ?? {})
      .map((p) => p.replace(/^\//, ""))
      .filter(Boolean)
      .sort();
  } catch {
    names = [];
  }
  console.log(`REST root → HTTP ${res.status}, ${names.length} exposed table(s)`);
  if (names.length) {
    for (const n of names) console.log(`  ${n}`);
  } else {
    console.log(`  (no tables in the response; first 200 chars: ${text.slice(0, 200)})`);
  }
} catch (e) {
  console.log(`REST root failed: ${e.message}`);
}

// Ask Postgres directly which relations exist, via RPC if it is exposed.
try {
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ query: "select 1" }),
  });
  console.log(`\nrpc/exec_sql → HTTP ${res.status}`);
} catch {
  // no exec_sql; fine
}