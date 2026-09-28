// Smoke-test the dev server: fetch each route, report status, latency, size and
// the <title>, so we can see whether the app renders locally.
const base = process.env.SSC_BASE ?? "http://localhost:8080";

const pages = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "/",
      "/practice",
      "/exams",
      "/daily-quiz",
      "/ai-coach",
      "/revision",
      "/bookmarks",
      "/my-progress",
      "/timer",
      "/partners",
      "/groups",
      "/inbox",
      "/profile",
      "/login",
      "/pricing",
      "/blog",
      "/jobs",
      "/admin",
      "/privacy",
      "/privacy-policy",
      "/terms-and-conditions",
      "/about-us",
      "/contact-us",
      "/sitemap.xml",
    ];

let failures = 0;

for (const path of pages) {
  const started = Date.now();
  try {
    const res = await fetch(base + path, { redirect: "manual" });
    const body = await res.text();
    const ms = Date.now() - started;
    const title = (body.match(/<title>([^<]*)<\/title>/)?.[1] ?? "").slice(0, 42);
    const bad = res.status >= 400;
    if (bad) failures++;
    console.log(
      `${bad ? "FAIL" : "ok  "} ${String(res.status).padEnd(4)}${String(ms + "ms").padStart(8)}  ` +
        `${String(body.length + "b").padStart(9)}  ${path.padEnd(24)} ${title}`,
    );
  } catch (e) {
    failures++;
    console.log(`ERR       ${path.padEnd(24)} ${e.message}`);
  }
}

console.log(`\n${pages.length - failures}/${pages.length} routes responded without a 4xx/5xx.`);
