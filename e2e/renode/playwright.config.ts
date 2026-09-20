import { defineConfig, devices } from "@playwright/test";

const SERVE_PORT = Number(process.env.SERVE_PORT || 4173);

// renode_serve.py + bridge.mjs are started by run-local.sh (local runs) or the
// CI workflow BEFORE playwright runs; they export WS_URL. This config only owns
// the static server for the built dya-studio dist.
export default defineConfig({
  testDir: "./tests",
  // Asset generation is opt-in and must go through the overwrite guard.
  testIgnore: "**/developer-guide-screenshots.spec.ts",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${SERVE_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node serve.mjs",
    port: SERVE_PORT,
    reuseExistingServer: !process.env.CI,
    env: {
      DIST_DIR: process.env.DIST_DIR || "dist",
      SERVE_PORT: String(SERVE_PORT),
    },
    stdout: "pipe",
    stderr: "pipe",
  },
});
