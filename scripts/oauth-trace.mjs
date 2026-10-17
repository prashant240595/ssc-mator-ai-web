// Reproduce the Google sign-in handshake headlessly and report exactly where it
// breaks: Supabase's authorize endpoint, Google's redirect, and the callback.
// Follows redirects manually so the Google error page is not swallowed.
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "");
}

const site = process.argv[2] ?? "https://ssc-mentor-ai.prashantsingh-240567.workers.dev";
const key = env.SUPABASE_PUBLISHABLE_KEY;
const ref = env.SUPABASE_PROJECT_ID;

// This is what supabase-js builds for signInWithOAuth({provider:"google"}).
const authorize = new URL(`https://${ref}.supabase.co/auth/v1/authorize`);
authorize.searchParams.set("provider", "google");
authorize.searchParams.set("redirect_to", `${site}/`);
authorize.searchParams.set("prompt", "select_account");

console.log(`site      ${site}`);
console.log(`project   ${ref}`);
console.log(`authorize ${authorize.href.replace(/(access_token|token)=[^&]+/g, "$1=REDACTED")}\n`);

let url = authorize.href;
for (let hop = 0; hop < 5; hop++) {
  let res;
  try {
    res = await fetch(url, { redirect: "manual", headers: { apikey: key } });
  } catch (e) {
    console.log(`hop ${hop}: request failed — ${e.message}`);
    break;
  }

  const loc = res.headers.get("location");
  console.log(`hop ${hop}: HTTP ${res.status}${res.headers.get("cf-ray") ? " [CF]" : ""}`);

  if (!loc) {
    const body = await res.text();
    const text = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    console.log(`  no redirect. body: ${text.slice(0, 300)}`);
    break;
  }

  const next = new URL(loc, url);
  // Do not print our own tokens if the flow got that far.
  const shown = next.hostname.includes("supabase.co")
    ? next.toString().replace(/([?&](?:access_token|refresh_token|token_type|code)=)[^&]*/g, "$1REDACTED")
    : next.toString();
  console.log(`  → ${shown.slice(0, 400)}`);

  if (next.hostname.endsWith("google.com") || next.hostname.endsWith("googleapis.com")) {
    // Google is rendering its consent/error page. Fetch it and extract the text.
    const page = await fetch(next.toString(), {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "manual",
    });
    const html = await page.text();
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const m = /redirect_uri_mismatch|Error 400|access_denied|invalid_request|Error \d+/i.exec(text);
    console.log(`\n  Google response: HTTP ${page.status}`);
    console.log(`  signal: ${m?.[0] ?? "(no error keyword found)"}`);
    const ri = /redirect_uri[^a-z]{1,20}([a-z]+:\/\/[^"'<\s]+)/i.exec(text);
    if (ri) console.log(`  redirect_uri sent: ${ri[1]}`);
    console.log(`  text: ${text.slice(0, 400)}`);
    break;
  }

  url = next.toString();
}