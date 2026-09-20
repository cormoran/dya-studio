import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

export default defineConfig(baseConfig, {
  testMatch: "**/developer-guide-screenshots.spec.ts",
  testIgnore: [],
});
