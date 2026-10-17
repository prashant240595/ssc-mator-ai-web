// Probe the live Worker over HTTP: status, title, and whether SSR content came
// through. Tells us whether the 404 is Cloudflare's (no route) or the app's
// own not-found page.
const base = process.argv[2];
if (!base) {
  console.error("usage: node scripts/live-check.mjs <base-url> [path ...]");
  process.exit(1);
}

const paths = process.argv.slice(3).length
  ? process.argv.slice(3)
  : ["/", "/practice", "/exams", "/jobs", "/blog", "/login", "/sitemap.xml"];

for (const p of paths) {
  const t = Date.now();
  try {
    const res = await fetch(base + p, { redirect: "manual" });
    const body = await res.text();
    const title = /<title>([^<]*)<\/title>/i.exec(body)?.[1] ?? "";
    const text = body
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const cfRay = res.headers.get("cf-ray") ? " [CF]" : "";
    console.log(
      `${String(res.status).padEnd(4)}${String(Date.now() - t + "ms").padStart(8)}${cfRay}  ${p.padEnd(16)} ${title.slice(0, 40) || text.slice(0, 40)}`,
    );
  } catch (e) {
    console.log(`ERR        ${p.padEnd(16)} ${e.message}`);
  }
}