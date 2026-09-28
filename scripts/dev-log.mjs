// Prints the tail of the dev server log, so we can see if Vite started and on
// which port. Path comes from the SSC_DEV_LOG env var.
import { readFileSync, existsSync } from "node:fs";

const path = process.env.SSC_DEV_LOG;
if (!path) {
  console.error("Set SSC_DEV_LOG to the log file path.");
  process.exit(1);
}
if (!existsSync(path)) {
  console.log(`no log yet at ${path}`);
  process.exit(0);
}
const text = readFileSync(path, "utf8");
console.log(text.slice(-Number(process.argv[2] ?? 2000)));
