// Estimate how many Cloudflare Worker invocations and subrequests a typical page
// view costs. Relevant because the Workers Free plan allows only 100k requests
// per day and 50 subrequests per invocation.
const base = process.env.SSC_BASE ?? "http://localhost:8080";
const path = process.argv[2] ?? "/";

const res = await fetch(base + path, { redirect: "follow" });
const html = await res.text();

// Count _serverFn / API round-trips the client is primed to make, plus inline
// data blobs the SSR pass already resolved.
const serverFnCalls = [...html.matchAll(/_serverFn/g)].length;
const apiRoutes = [...html.matchAll(/\/api\/public\//g)].length;
const inlineData = [...html.matchAll(/window\.__[A-Z_]+__/g)].length;
const supabaseUrls = [...new Set([...html.matchAll(/https:\/\/[a-z0-9]+\.supabase\.co/g)].map((m) => m[0]))];
const prefetched = [...html.matchAll(/\/_build\/assets\/|\/assets\//g)].length;

console.log(`${path}\n`);
console.log(`  HTML size            ${html.length} bytes`);
console.log(`  server function hits ${serverFnCalls}`);
console.log(`  /api/ routes         ${apiRoutes}`);
console.log(`  Supabase origins     ${supabaseUrls.length ? supabaseUrls.join(", ") : "none inline"}`);
console.log(`  inline data blobs    ${inlineData}`);
console.log(`  asset references     ${prefetched}`);

// Cloudflare bills a Worker invocation per request that is NOT a static asset
// hit. Static assets under /assets are served from the edge for free.
const workerInvocations = 1; // the document request itself
const subrequests = serverFnCalls + apiRoutes;

console.log(`\n  → ${workerInvocations} worker invocation for the document`);
console.log(`  → up to ${subrequests} server-side calls, each = 1 subrequest (limit 50/request on Free)`);
console.log(`\n  Assets (/assets/*) are served from Cloudflare's edge: free and unlimited,`);
console.log(`  and do not consume the 100k/day request quota.`);
