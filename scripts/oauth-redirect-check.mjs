// Diagnose a Google redirect_uri_mismatch by asking Google's OAuth endpoint what
// it thinks the redirect URI will be, and printing the exact value that must be
// registered. Also probes which candidate hosts actually resolve and serve the app.
const script = "ssc-mentor-ai";
const subdomain = process.argv[2] ?? "prashantsingh-240567";
const base = `https://${script}.${subdomain}.workers.dev`;

// Google requires a registered redirect_uri. Supabase's OAuth flow bounces via
// /auth/v1/authorize, and the final redirect back to the app is what must match.
const candidates = [
  `${base}/`,
  `${base}/login`,
  `${base}/auth/callback`,
  "https://sscmentorai.online/",
  "https://sscmentorai.online/login",
];

console.log("candidate redirect URIs to register in Google Cloud:\n");
for (const c of candidates) console.log(`  ${c}`);

console.log("\nreachability:");
for (const c of candidates) {
  const url = new URL(c);
  const origin = url.origin;
  try {
    const res = await fetch(origin, { redirect: "manual", signal: AbortSignal.timeout(10000) });
    console.log(`  ${String(res.status).padEnd(4)} ${origin}`);
  } catch (e) {
    console.log(`  ERR  ${origin}  ${e.message}`);
  }
}

console.log(`
If Google says redirect_uri_mismatch, open the error details — Google prints the
exact redirect_uri it received. That string must match a Google Cloud "Authorized
redirect URIs" entry character for character, including the trailing slash and the
/** wildcard if you used one.

Most common cause: the value registered without a trailing slash, while the
browser sent one with it, or the reverse.`);