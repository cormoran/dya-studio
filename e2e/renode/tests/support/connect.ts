import { expect, type Page } from "@playwright/test";
import { serialShimSource } from "../../serial-shim.mjs";

export const WS_URL = process.env.WS_URL || "ws://127.0.0.1:8788";

// Name the DUT firmware advertises via GetDeviceInfo. The default DUT is
// zmk-west-commands' real studio-rpc-usb-uart image (renode_tester shield ->
// name "Renode"); override for a real dya build.
export const DEVICE_NAME = process.env.DEVICE_NAME || "Renode";

// Reproduce the exact connect flow proven by tests/connect.spec.ts: install the
// navigator.serial shim (backed by the WS bridge -> the DUT's emulated USB CDC
// in Renode), pre-accept the notice + force English, reduce motion, click the
// real "Connect via USB" button, and wait until the app reaches the
// fully-connected screen (the device's own name in the header).
//
// Also auto-accepts native confirm() dialogs: several keymap actions (delete
// layer, discard changes) gate on window.confirm, which Playwright otherwise
// auto-dismisses (confirm -> false), silently no-op'ing the action.
export async function connect(page: Page): Promise<void> {
  page.on("console", (m) => {
    if (process.env.E2E_DEBUG) console.log(`PAGE [${m.type()}] ${m.text()}`);
  });
  page.on("pageerror", (e) => {
    if (process.env.E2E_DEBUG) console.log("PAGE ERROR " + e.message);
  });
  page.on("dialog", (d) => {
    if (process.env.E2E_DEBUG) console.log("DIALOG " + d.message());
    void d.accept();
  });

  await page.addInitScript(serialShimSource(WS_URL));
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        "dya-studio-connection-notice-accepted-serial",
        "1.1.0",
      );
      localStorage.setItem("dya-studio-language", "en");
    } catch {
      /* ignore */
    }
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const usbButton = page.getByRole("button", { name: /Connect via USB/i });
  await expect(usbButton).toBeVisible();
  await usbButton.click({ force: true });

  await expect(page.locator("header").getByText(DEVICE_NAME)).toBeVisible({
    timeout: 60_000,
  });
  await expect(usbButton).toBeHidden();
}

// Open the Keymap tab and wait for the layer grid (the 2x2 renode_tester keymap
// A/B/C/D) to paint, proving the keymap.* RPC round-trip completed.
export async function openKeymap(page: Page): Promise<void> {
  await page.getByRole("tab", { name: "Keymap" }).click();
  await expect(page.getByText("A", { exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });
}

// Scope to the semantic layer-tab group. Unlike a CSS utility-class locator,
// this survives presentation-only Keymap toolbar changes while still excluding
// main navigation, layer-management controls, and portal'd restore-menu items.
export function layerTabs(page: Page) {
  return page.getByRole("group", { name: "Keymap layers" }).getByRole("button");
}
