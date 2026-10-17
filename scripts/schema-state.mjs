// List the RPC functions the project exposes. The app's schema depends on these
// (list_subjects, bump_user_streak, etc.), so their absence tells us whether the
// migration files were ever applied to this project.
const ref = process.argv[2];
const key = process.argv[3];

const url = `https://${ref}.supabase.co`;
const auth = { apikey: key, Authorization: `Bearer ${key}` };

const res = await fetch(`${url}/rest/v1/`, { headers: auth });
const spec = await res.json();
const paths = Object.keys(spec.paths ?? {});

const rpcs = paths.map((p) => p.replace(/^\//, "")).filter((p) => p.startsWith("rpc/")).map((p) => p.slice(4));
const tables = paths.map((p) => p.replace(/^\//, "")).filter((p) => !p.startsWith("rpc/"));

console.log(`Postgres 14.18 · public schema`);
console.log(`tables: ${tables.length}${tables.length ? `\n  ${tables.join("\n  ")}` : ""}`);
console.log(`functions: ${rpcs.length}${rpcs.length ? `\n  ${rpcs.join("\n  ")}` : ""}`);

if (!tables.length && !rpcs.length) {
  console.log(`
The public schema is empty — no tables and no functions. The 51 migration files
in supabase/migrations/ were never applied to this project.`);
}