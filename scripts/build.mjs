// Cross-platform build wrapper.
//
// Why this exists: the Nitro/rollup bundling step for this app needs more than
// Node's default heap (~2 GB) and crashes with "Reached heap limit" on machines
// with less RAM. Setting NODE_OPTIONS from an npm script is not portable
// (`set X=Y &&` is cmd-only, `X=Y` is POSIX-only), so we re-exec Node here with
// the flag set. Cloudflare's CI already has a large heap, so this is a no-op
// there — it just makes local `npm run build` reliable.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HEAP_MB = 8192;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vite = join(root, "node_modules", "vite", "bin", "vite.js");

if (!existsSync(vite)) {
  console.error("[build] vite not found — run `npm install` first.");
  process.exit(1);
}

const opts = { ...process.env };
const current = /--max-old-space-size=(\d+)/.exec(opts.NODE_OPTIONS ?? "");
const currentMb = current ? Number(current[1]) : 0;

if (currentMb < HEAP_MB) {
  const flag = `--max-old-space-size=${HEAP_MB}`;
  opts.NODE_OPTIONS = current
    ? opts.NODE_OPTIONS.replace(current[0], flag)
    : `${opts.NODE_OPTIONS ? `${opts.NODE_OPTIONS} ` : ""}${flag}`;
}

const child = spawn(process.execPath, [vite, "build", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: opts,
  cwd: root,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
