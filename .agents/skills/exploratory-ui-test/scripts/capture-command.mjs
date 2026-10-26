import { spawn } from "node:child_process";
import { mkdirSync, openSync, closeSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

// No shell interpolation, output filtering, retries, or implicit timeout. A new
// directory per operation prevents both accidental overwrite and lost stdout.
try {
  const [directory, separator, executable, ...args] = process.argv.slice(2);
  if (!directory || separator !== "--" || !executable)
    throw new Error(
      "Usage: capture-command.mjs <new-directory> -- <executable> [args...]",
    );
  const target = resolve(directory);
  mkdirSync(target); // EEXIST is intentional: never replace an earlier receipt.
  const stdout = openSync(join(target, "stdout.txt"), "wx");
  const stderr = openSync(join(target, "stderr.txt"), "wx");
  writeFileSync(
    join(target, "command.json"),
    JSON.stringify(
      {
        executable,
        args,
        cwd: process.cwd(),
        startedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  const child = spawn(executable, args, { stdio: ["ignore", stdout, stderr] });
  let spawnError;
  child.on("error", (error) => {
    spawnError = error.message;
  });
  // Preserve normal termination receipts where possible. SIGKILL/crash leaves
  // no result.json and must be treated as unfinished, never a completed error.
  const forward = (signal) => child.kill(signal);
  process.on("SIGTERM", () => forward("SIGTERM"));
  process.on("SIGINT", () => forward("SIGINT"));
  child.on("close", (code, signal) => {
    closeSync(stdout);
    closeSync(stderr);
    const result = {
      code,
      signal,
      error: spawnError ?? null,
      finishedAt: new Date().toISOString(),
    };
    writeFileSync(
      join(target, "result.json"),
      JSON.stringify(result, null, 2),
      { flag: "wx" },
    );
    console.log(JSON.stringify({ directory: target, ...result }));
    process.exitCode = code === 0 && !signal && !spawnError ? 0 : 1;
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
