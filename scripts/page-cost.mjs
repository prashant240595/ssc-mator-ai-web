// Look at what a rendered page actually loads: script srcs, asset URLs, and
// whether TanStack server functions are referenced. Helps estimate the
// per-visit cost against Cloudflare's 100k requests/day free quota.
const base = process.env.SSC_BASE ?? "http://localhost:8080";
const path = process.argv[2] ?? "/";

const res = await fetch(base + path);
const html = await res.text();

const scripts = [...html.matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/g)].map((m) => m[1]);
const assets = [...new Set([...html.matchAll(/\/assets\/[A-Za-z0-9._-]+/g)].map((m) => m[0]))];
const serverFn = [...new Set([...html.matchAll(/[/_a-zA-Z0-9]*_serverFn[A-Za-z0-9_]*/g)].map((m) => m[0]))];
const supabase = [...new Set([...html.matchAll(/https:\/\/[a-z0-9]+\.supabase\.co/g)].map((m) => m[0]))];

console.log(`${path}  (${html.length} bytes)\n`);
console.log(`script tags           ${scripts.length}`);
for (const s of scripts.slice(0, 6)) console.log(`   ${s}`);
console.log(`\n/assets/* references  ${assets.length}`);
for (const a of assets.slice(0, 4)) console.log(`   ${a}`);
console.log(`\nserver-function ids   ${serverFn.length} ${serverFn.slice(0, 3).join(", ")}`);
console.log(`supabase origins      ${supabase.length ? supabase.join(", ") : "(none inline — fetched at runtime)"}`);

console.log(`
Cost model on Cloudflare Workers Free:
  - 1 Worker invocation for the HTML document
  - every /assets/* file is served from the edge: free, unlimited, no quota
  - runtime fetches to Supabase are subrequests (limit 50 per invocation)
  - a normal visitor = ~1 invocation + a handful of subrequests
  => 100,000 requests/day is roughly 3,000+ page views/day, and assets
     do not count against it at all.
`);
