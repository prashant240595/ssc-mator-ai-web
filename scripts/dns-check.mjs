// Is this a DNS problem on our side, or is Supabase actually down?
// Compares our resolver against a public one (8.8.8.8) so we can tell.
import { lookup, Resolver } from "node:dns/promises";

const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["fjpmohfovknezctoqdew.supabase.co", "supabase.com", "google.com", "github.com"];

console.log("--- system resolver ---");
for (const n of names) {
  try {
    const r = await lookup(n);
    console.log(`OK     ${n} -> ${r.address}`);
  } catch (e) {
    console.log(`FAIL   ${n} -> ${e.code ?? e.message}`);
  }
}

console.log("\n--- via public resolver 8.8.8.8 ---");
for (const n of names) {
  const resolver = new Resolver();
  resolver.setServers(["8.8.8.8"]);
  try {
    const r = await resolver.resolve4(n);
    console.log(`OK     ${n} -> ${r.join(", ")}`);
  } catch (e) {
    console.log(`FAIL   ${n} -> ${e.code ?? e.message}`);
  }
}