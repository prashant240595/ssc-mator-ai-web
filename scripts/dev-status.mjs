// Is the dev server still up? Prints reachable/not so we can tell whether the
// background `npm run dev` window is still holding a port.
const base = process.env.SSC_BASE ?? "http://localhost:8080";

try {
  const res = await fetch(base, { signal: AbortSignal.timeout(3000) });
  console.log(`dev server: RUNNING at ${base} (HTTP ${res.status})`);
} catch {
  console.log(`dev server: not reachable at ${base}`);
}
