import { test, expect, type Page, type Locator } from "@playwright/test";
import { connectDya2 } from "./dya2.helpers";

// The dya2 (main+dya) Settings tab drives two settings subsystems:
//   - zmk__settings            (the Power Management idle/sleep timeouts)
//   - cormoran_custom_settings (the collapsible "Advanced Settings" BYTES/scalar
//                               blobs; not touched here)
//
// This spec proves the zmk__settings path end-to-end against the REAL dya2
// firmware in Renode: the central's activity settings load over the emulated
// USB CDC, the Idle Timeout is changed to a new preset, the debounced
// write-through persists it (setActivitySettings RPC), the Reload button re-reads
// it from the device (loadAllSettings via getAllActivitySettings + activity
// notifications), and finally it is REVERTED to the exact original value so the
// device NVS is left exactly as found. Net-zero.
//
// It deliberately does NOT touch the destructive "Reset all settings" (that
// wipes keymap + all custom settings) nor the Sleep Timeout — only the Idle
// Timeout is edited and restored.

// The idle/sleep TimeDropdown buttons are the only `button.input-field` elements
// inside the Power Management card; idle is first, sleep second.
function idleDropdown(page: Page): Locator {
  const powerCard = page
    .locator(".glass-card")
    .filter({ hasText: "Power Management" });
  return powerCard.locator("button.input-field").first();
}

// The TimeDropdown renders its open menu into a body portal (`div.fixed.w-48`).
function dropdownMenu(page: Page): Locator {
  return page.locator("div.fixed.w-48");
}

// Map the dropdown's display label to a minutes value. Presets: "Never" (0),
// "30 seconds" (0.5), "N minute(s)" (N); a custom value shows "N min".
function displayToMinutes(text: string): number {
  const s = text.trim();
  if (/never/i.test(s)) return 0;
  const num = Number.parseFloat(s.replace(/[^\d.]/g, "")) || 0;
  if (/second/i.test(s)) return num / 60;
  return num;
}

// Set the Idle Timeout to an exact minutes value via the dropdown's "Custom
// value..." input — deterministic for any value (preset or not), so both the
// edit and the revert restore an exact number of minutes.
async function setIdleMinutes(page: Page, minutes: number): Promise<void> {
  await idleDropdown(page).click();
  const menu = dropdownMenu(page);
  await expect(menu).toBeVisible();
  await menu
    .getByRole("button", { name: "Custom value...", exact: true })
    .click();
  const input = menu.locator('input[type="number"]');
  await expect(input).toBeVisible();
  await input.fill(String(minutes));
  await menu.getByRole("button", { name: "Set", exact: true }).click();
  await expect(menu).toBeHidden();
}

// Force a device re-read. Tab panels keep their state across switches (they stay
// mounted), so a tab round-trip no longer re-fetches; the Settings header's
// Reload button re-runs loadAllSettings. It is disabled for the duration of the
// load, so waiting for disabled -> enabled proves the assertions below read
// fresh device data.
async function reReadSettings(page: Page): Promise<void> {
  const reload = page.getByRole("button", { name: "Reload", exact: true });
  await expect(reload).toBeEnabled();
  await reload.click();
  await expect(reload).toBeDisabled();
  await expect(reload).toBeEnabled({ timeout: 180_000 });
}

// Preset minutes -> the exact label the dropdown renders for them, used to
// assert the on-screen value after an edit lands.
const PRESET_LABEL: Record<number, string> = {
  1: "1 minute",
  5: "5 minutes",
  10: "10 minutes",
};

test("dya2 Settings tab: reads, changes, persists and reverts the Idle Timeout (zmk__settings)", async ({
  page,
}) => {
  // Two-machine wired-split emulation is slow: initial load + one write + a
  // re-read + a revert write + a final re-read. Be generous.
  test.setTimeout(360_000);
  if (process.env.E2E_DEBUG) {
    page.on("console", (m) => console.log(`PAGE [${m.type()}] ${m.text()}`));
    page.on("pageerror", (e) => console.log("PAGE ERROR " + e.message));
  }
  // No native confirm() on this (non-destructive) path, but accept defensively.
  page.on("dialog", (d) => void d.accept());

  await connectDya2(page);

  // Open the Settings tab.
  await page.getByRole("tab", { name: "Settings" }).click();

  // 1) The zmk__settings subsystem responded: the Power Management card renders
  //    and the per-device summary paints (proves getAllActivitySettings +
  //    activity notifications round-tripped for the Central source).
  const idle = idleDropdown(page);
  await expect(idle).toBeVisible({ timeout: 120_000 });
  await expect(
    page.getByText("Current Settings by Device", { exact: false }),
  ).toBeVisible({ timeout: 120_000 });

  // Read the ORIGINAL idle value once the device state has loaded.
  const originalLabel = (await idle.innerText()).trim();
  const originalMinutes = displayToMinutes(originalLabel);

  // 2) Choose a NEW idle value: a preset that differs from the current one, so
  //    the change is unambiguous and renders a known label.
  const newMinutes = [5, 10, 1].find((m) => m !== originalMinutes)!;
  const newLabel = PRESET_LABEL[newMinutes];

  // 3) CHANGE the Idle Timeout -> newMinutes. The edit reflects immediately in
  //    the button (optimistic pending value).
  await setIdleMinutes(page, newMinutes);
  await expect(idle).toContainText(newLabel);

  // 4) PERSIST: the debounced write-through fires setActivitySettings over the
  //    emulated USB CDC; "Saved" confirms the write completed.
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({
    timeout: 60_000,
  });

  // 5) ROUND-TRIP: re-read from the device; the new value must have persisted.
  await reReadSettings(page);
  await expect(idleDropdown(page)).toContainText(newLabel, {
    timeout: 120_000,
  });

  // 6) REVERT to the exact original idle value and persist it, so the device is
  //    left exactly as found (net-zero).
  await setIdleMinutes(page, originalMinutes);
  await expect(idleDropdown(page)).toContainText(originalLabel);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({
    timeout: 60_000,
  });

  // 7) Final re-read: back to the original idle value on the device.
  await reReadSettings(page);
  await expect(idleDropdown(page)).toContainText(originalLabel, {
    timeout: 120_000,
  });
});
