// Verify a Supabase key set before it goes into .env. Prints only redacted
// values so secrets never land in terminal scrollback or logs.
const [anonJwt, publishable, secret] = [
  process.argv[2],
  process.argv[3],
  process.argv[4],
];

function claimsOf(jwt) {
  try {
    return JSON.parse(Buffer.from(jwt.split(".")[1], "base64").toString());
  } catch {
    return null;
  }
}

const mask = (s) => (s.length <= 12 ? "…" : `${s.slice(0, 8)}…${s.slice(-4)} (${s.length} chars)`);

const c = claimsOf(anonJwt);
if (!c) {
  console.log("could not decode the JWT");
} else {
  console.log("--- service_role JWT claims ---");
  for (const [k, v] of Object.entries(c)) console.log(`  ${k.padEnd(6)} ${v}`);
  console.log(`\n  ref        ${c.ref}`);
  console.log(`  role       ${c.role}`);
  console.log(`  issued     ${new Date(c.iat * 1000).toISOString()}`);
  console.log(`  expires    ${new Date(c.exp * 1000).toISOString()}`);
  console.log(`\n  matches djvywlfkwtakkbagksgh: ${c.ref === "djvywlfkwtakkbagksgh" ? "YES" : "NO"}`);
}

console.log("\n--- key formats ---");
console.log(`  publishable  ${mask(publishable ?? "")}  prefix ok: ${(publishable ?? "").startsWith("sb_publishable_") ? "YES" : "NO"}`);
console.log(`  secret       ${mask(secret ?? "")}  prefix ok: ${(secret ?? "").startsWith("sb_secret_") ? "YES" : "NO"}`);
console.log(`  jwt length   ${(anonJwt ?? "").length} chars, ${(anonJwt ?? "").split(".").length} parts`);