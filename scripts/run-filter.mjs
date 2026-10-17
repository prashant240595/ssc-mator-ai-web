// Run a command and print only the lines matching a pattern, so long build or
// deploy output does not flood the terminal. Usage:
//   node scripts/run-filter.mjs <pattern> <command> [args...]
import { spawn } from "node:child_process";

const [pattern, ...cmd] = process.argv.slice(2);
if (!pattern || !cmd.length) {
  console.error('usage: node scripts/run-filter.mjs "<regex>" <command> [args...]');
  process.exit(1);
}

const re = new RegExp(pattern, "i");
const child = spawn(cmd[0], cmd.slice(1), { shell: true, stdio: ["inherit", "pipe", "pipe"] });

const seen = new Set();
let tail = "";
for (const stream of [child.stdout, child.stderr]) {
  let buf = "";
  stream.on("data", (c) => {
    buf += c.toString();
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() ?? "";
    tail = buf;
    for (const line of lines) {
      if (!re.test(line)) continue;
      const key = line.trim();
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(key.slice(0, 200));
    }
  });
}

child.on("close", (code) => {
  if (tail && re.test(tail)) console.log(tail.trim().slice(0, 200));
  console.log(`\nexit code ${code}`);
  process.exit(code ?? 0);
});