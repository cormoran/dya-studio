import { test, expect } from "@playwright/test";
import { connect, openKeymap, layerTabs } from "../support/connect";

// "Reset all settings" (factory reset) coverage for OFFICIAL ZMK firmware in
// Renode, via the core `reset_settings` RPC (Settings tab → Danger Zone).
//
// DESTRUCTIVE + ISOLATED: this wipes every persisted setting on the device, so
// it MUST run in its own run-local.sh invocation (its own fresh Renode boot).
// The test first PERSISTS a keymap change (so there is a real deviation to
// undo), then resets, then proves the device came back to firmware defaults.
//
// `core.reset_settings` restores the in-memory stock keymap without rebooting
// (verified against zmk keymap.c: reset callback reload_from_stock_keymap), so
// the same connection can re-read the keymap and observe the defaults.

const KEYS = ["A", "B", "C", "D"]; // renode_tester default_layer bindings
const EDITED_KEYCODE = "F"; // not in the default keymap

// Tab panels stay mounted once visited, so scope every text match to the panel
// that is currently showing — otherwise a `toHaveCount(0)` would also count
// matches inside a hidden (but still rendered) tab.
function activePanel(page: import("@playwright/test").Page) {
  return page.locator('[role="tabpanel"][data-state="active"]');
}

function keyLabel(page: import("@playwright/test").Page, label: string) {
  return activePanel(page).getByText(label, { exact: true });
}

test("Reset all settings restores the keyboard to firmware defaults (core.resetSettings)", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await connect(page);
  await openKeymap(page);
  // Baseline: the default A/B/C/D keymap is painted.
  for (const k of KEYS) {
    await expect(keyLabel(page, k).first()).toBeVisible({ timeout: 60_000 });
  }

  // 1) Make a PERSISTED change so reset has something to undo: reassign key A to
  //    `&kp F` and Save it to flash (keymap.setLayerBinding + saveChanges).
  await keyLabel(page, "A").first().click();
  const editor = page.getByRole("dialog");
  await expect(editor.getByText("Select Key Binding")).toBeVisible();
  await editor
    .getByRole("button", { name: EDITED_KEYCODE, exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(keyLabel(page, EDITED_KEYCODE).first()).toBeVisible();

  const saveButton = page.getByRole("button", { name: "Save" });
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(saveButton).toBeDisabled();

  // 2) Factory reset from Settings → Danger Zone → "Reset all settings" (opens a
  //    confirm dialog, then fires core.resetSettings).
  await page.getByRole("tab", { name: "Settings" }).click();
  const resetTrigger = page.getByRole("button", {
    name: "Reset all settings",
  });
  await expect(resetTrigger).toBeVisible();
  await resetTrigger.click();

  const confirm = page.getByRole("dialog");
  await expect(confirm.getByText("Reset all settings?")).toBeVisible();
  // The confirm button in the dialog carries the same "Reset all settings" label.
  await confirm.getByRole("button", { name: "Reset all settings" }).click();
  // On success the dialog closes and no error is surfaced.
  await expect(confirm).toBeHidden({ timeout: 30_000 });

  // 3) Re-read the keymap and prove the device is back to firmware defaults:
  //    A/B/C/D are restored and the saved `F` edit is gone, confirming
  //    reset_settings wiped the persisted change. Tab panels keep their state
  //    across switches (they stay mounted), so returning to the Keymap tab shows
  //    the pre-reset keymap until its Reload button re-runs get_keymap. Reload is
  //    disabled for the duration of the load, so disabled -> enabled marks the
  //    fresh device data landing.
  await page.getByRole("tab", { name: "Keymap" }).click();
  const reload = page.getByRole("button", { name: "Reload", exact: true });
  await expect(reload).toBeEnabled();
  await reload.click();
  await expect(reload).toBeDisabled();
  await expect(reload).toBeEnabled({ timeout: 60_000 });

  for (const k of KEYS) {
    await expect(keyLabel(page, k).first()).toBeVisible({ timeout: 60_000 });
  }
  await expect(keyLabel(page, EDITED_KEYCODE)).toHaveCount(0);
  // The four default layers are intact (structural reset is also default).
  await expect(layerTabs(page)).toHaveText([
    "Base",
    "Lower",
    "Raise",
    "Adjust",
  ]);
});
