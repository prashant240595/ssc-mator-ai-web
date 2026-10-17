// Count the URLs in the generated sitemap.xml. Google needs every page listed
// here to index them.
const base = process.env.SSC_BASE ?? "http://localhost:8080";

const res = await fetch(`${base}/sitemap.xml`);
const xml = await res.text();

const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const byType = {};
for (const loc of locs) {
  let kind = "other";
  if (/\/jobs\/[a-z0-9-]+$/i.test(loc)) kind = "job post";
  else if (/\/blog\/[a-z0-9-]+$/i.test(loc)) kind = "blog post";
  else if (/\/jobs/.test(loc)) kind = "jobs listing";
  else if (/\/blog/.test(loc)) kind = "blog listing";
  else if (loc.endsWith("/")) kind = "homepage";
  else kind = "static page";
  byType[kind] = (byType[kind] || 0) + 1;
}

console.log(`sitemap.xml → HTTP ${res.status}, ${xml.length} bytes`);
console.log(`${locs.length} URLs submitted to Google\n`);
for (const [kind, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${kind}`);
}
console.log(`\nsample:`);
for (const loc of locs.slice(0, 5)) console.log(`  ${loc}`);
