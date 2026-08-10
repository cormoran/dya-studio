import { test, expect, type Page } from "@playwright/test";

// This is an asset-generation test, not a product assertion suite. It uses the
// built-in Demo keyboard so every screen is reproducible without a physical
// keyboard, a Renode image, or a WebSerial shim. The app's demo transport
// exposes the developer-guide subsystems (macro, combo, PMW3610, connection,
// settings and diagnostics) with deterministic seed data.
//
// Run it only through `npm run screenshots:developer-guide` from this folder.
// The test deliberately writes only the new guide asset names, and refuses to
// replace an existing image (Playwright's `path` would otherwise overwrite it).

const outputDir = "../../public/images/developer-guide/light-mode";

test.use({
  viewport: { width: 1440, height: 1200 },
  colorScheme: "light",
  deviceScaleFactor: 1,
  locale: "en-US",
  reducedMotion: "reduce",
});

async function connectDemo(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("dya-studio-theme", "light");
    localStorage.setItem("dya-studio-language", "en");
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Try Demo Mode" }).click();
  await expect(
    page.getByText("DYA Keyboard (Demo)", { exact: true }),
  ).toBeVisible();
}

async function capture(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `${outputDir}/${name}.png`,
    fullPage: false,
    animations: "disabled",
  });
}

test("capture light-mode developer-guide UI assets", async ({ page }) => {
  test.setTimeout(120_000);
  await connectDemo(page);

  await page.getByRole("tab", { name: "Keymap" }).click();
  await expect(
    page.getByRole("button", { name: "Base", exact: true }),
  ).toBeVisible();
  await capture(page, "keymap");

  await page.getByRole("tab", { name: "Macro&Combo" }).click();
  const macros = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Macros", exact: true }),
  });
  await expect(macros).toBeVisible();
  await macros.getByTitle("Create macro").click();
  await expect(
    page.getByRole("heading", { name: "Steps", exact: true }),
  ).toBeVisible();
  await capture(page, "macro");

  const combos = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Combos", exact: true }),
  });
  await expect(combos).toBeVisible();
  await combos.getByTitle("New combo").click();
  await expect(
    page.getByRole("heading", { name: "Combo Editor", exact: true }),
  ).toBeVisible();
  await capture(page, "combo");

  await page.getByRole("tab", { name: "Trackball" }).click();
  await expect(
    page.getByRole("heading", { name: "Trackball Settings" }),
  ).toBeVisible();
  await expect(
    page.getByText("PMW3610 Drivers", { exact: true }),
  ).toBeVisible();
  await capture(page, "trackball");

  await page.getByRole("tab", { name: "Connection" }).click();
  await expect(
    page.getByText("Per-OS Default Layers", { exact: true }),
  ).toBeVisible();
  await capture(page, "connection");

  await page.getByRole("tab", { name: "Settings" }).click();
  await expect(
    page.getByText("Power Management", { exact: true }),
  ).toBeVisible();
  await capture(page, "settings");

  await page.getByRole("tab", { name: "Troubleshooting" }).click();
  const deviceInfo = page.getByRole("button", {
    name: "Device Info",
    exact: true,
  });
  await expect(deviceInfo).toBeVisible();
  await deviceInfo.click();
  await expect(page.getByText("ZMK Version", { exact: true })).toBeVisible();
  await capture(page, "troubleshooting");
});
