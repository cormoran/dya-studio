import { test, expect, type Page, type Locator } from "@playwright/test";
import { connectDya2 } from "./dya2.helpers";

// dya2 is the cormoran fork (main+dya): an UNLOCKED, rich ~8-layer keyboard
// (Base/Win/Mac/iOS/Linux/Config/Mouse/Scroll) whose keymap is served over the
// fork's fast-keymap RPC path plus the core keymap.* / behaviors.* subsystems.
//
// This spec proves that path end-to-end against the REAL dya2 firmware in
// Renode: the keymap renders (named layers + per-key behaviors), then a single
// simple-keypress binding is edited, saved to flash, re-read from the device via
// the Reload button, and finally REVERTED so the device is left exactly as found.
//
// Edit target: `&kp J` is a UNIQUE single-letter keypress on the Base layer
// (this split layout duplicates Y/G/H/B, so those are avoided). It is reassigned
// to `&kp F13` -- F13 is absent from the Base layer, so its appearance in the
// grid is unambiguous proof the write landed -- then reverted back to J. Both
// endpoints are plain Key Press bindings, so the revert reproduces the original
// binding exactly (byte-for-byte on the wire).
const ORIG_KEY = "J";
const NEW_KEY = "F13";

// Tab panels stay mounted once visited, so scope every text match to the panel
// that is currently showing — otherwise a `toHaveCount(0)` would also count
// matches inside a hidden (but still rendered) tab.
function activePanel(page: Page): Locator {
  return page.locator('[role="tabpanel"][data-state="active"]');
}

// A key in the on-screen physical-keymap grid renders its binding's short label
// (for `&kp J` that's just "J") in a span; match that label exactly.
function keyLabel(page: Page, label: string): Locator {
  return activePanel(page).getByText(label, { exact: true });
}

// Open the binding editor for the (unique) key currently showing `label`.
async function openKeyEditor(page: Page, label: string): Promise<Locator> {
  await keyLabel(page, label).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Select Key Binding")).toBeVisible();
  return dialog;
}

// Pick a keycode from the selector's grid by searching for it and clicking its
// button. The Key Press behavior is pre-selected (from the key's current
// binding), keycode is its only parameter, and "close on select" (default on)
// applies the pick and closes the dialog.
async function pickKeycode(
  page: Page,
  dialog: Locator,
  keycode: string,
): Promise<void> {
  const search = dialog.getByPlaceholder("Search keycodes...");
  await expect(search).toBeVisible();
  await search.fill(keycode);
  await dialog.getByRole("button", { name: keycode, exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

// Force a device re-read. Tab panels keep their state across switches, so a tab
// round-trip no longer re-fetches; the Keymap header's Reload button re-runs the
// keymap load. It is disabled for the duration of the load, so waiting for
// disabled -> enabled proves the assertions below read fresh device data.
async function reReadKeymap(page: Page): Promise<void> {
  const reload = page.getByRole("button", { name: "Reload", exact: true });
  await expect(reload).toBeEnabled();
  await reload.click();
  await expect(reload).toBeDisabled();
  await expect(reload).toBeEnabled({ timeout: 180_000 });
}

test("dya2 Keymap tab: renders the rich keymap and round-trips (+reverts) a binding edit", async ({
  page,
}) => {
  // The dya2 two-machine wired-split emulation is slow, and this test loads the
  // keymap three times (initial + two reloads) plus two saves; be generous.
  test.setTimeout(480_000);
  if (process.env.E2E_DEBUG) {
    page.on("console", (m) => console.log(`PAGE [${m.type()}] ${m.text()}`));
    page.on("pageerror", (e) => console.log("PAGE ERROR " + e.message));
  }
  // Auto-accept any native confirm() (none expected on the happy path here).
  page.on("dialog", (d) => void d.accept());

  await connectDya2(page);

  // Open the Keymap tab.
  await page.getByRole("tab", { name: "Keymap" }).click();

  // 1) The keymap RENDERS: dya2's named layers paint as layer buttons...
  for (const layer of ["Base", "Win", "Mac", "iOS", "Linux", "Scroll"]) {
    await expect(
      page.getByRole("button", { name: layer, exact: true }),
    ).toBeVisible({ timeout: 120_000 });
  }
  // ...and the Base layer's per-key behaviors paint into the grid (this is a
  // real fast-keymap + behaviors.* round-trip). Q and our target J are both
  // simple keypresses present exactly once.
  await expect(keyLabel(page, "Q").first()).toBeVisible({ timeout: 120_000 });
  await expect(keyLabel(page, ORIG_KEY).first()).toBeVisible();
  // The new keycode is NOT present yet (baseline for the edit assertion).
  await expect(keyLabel(page, NEW_KEY)).toHaveCount(0);

  // 2) The behavior picker is populated from the device: opening J's editor
  //    pre-selects its Key Press behavior (behaviors.* RPC).
  let dialog = await openKeyEditor(page, ORIG_KEY);
  await expect(dialog.getByText("Key Press").first()).toBeVisible();

  // 3) CHANGE the binding: reassign J -> F13.
  await pickKeycode(page, dialog, NEW_KEY);
  // The edit is reflected in the UI (unsaved), and F13 now paints where J was.
  await expect(keyLabel(page, NEW_KEY).first()).toBeVisible();
  await expect(keyLabel(page, ORIG_KEY)).toHaveCount(0);
  await expect(
    page.getByText("Unsaved changes", { exact: true }),
  ).toBeVisible();

  // 4) SAVE to the device (keymap.* set/save RPC over the emulated USB CDC).
  const save = page.getByRole("button", { name: "Save", exact: true });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  await expect(save).toBeDisabled();

  // 5) ROUND-TRIP: re-read from the device; the change must have persisted.
  await reReadKeymap(page);
  await expect(keyLabel(page, NEW_KEY).first()).toBeVisible({
    timeout: 120_000,
  });
  await expect(keyLabel(page, ORIG_KEY)).toHaveCount(0);

  // 6) REVERT: F13 -> J, save, and confirm the original binding is restored so
  //    the device is left exactly as found.
  dialog = await openKeyEditor(page, NEW_KEY);
  await pickKeycode(page, dialog, ORIG_KEY);
  await expect(keyLabel(page, ORIG_KEY).first()).toBeVisible();
  await expect(keyLabel(page, NEW_KEY)).toHaveCount(0);
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  await expect(save).toBeDisabled();

  // 7) Final re-read: back to the original binding, no stray F13 anywhere.
  await reReadKeymap(page);
  await expect(keyLabel(page, ORIG_KEY).first()).toBeVisible({
    timeout: 120_000,
  });
  await expect(keyLabel(page, NEW_KEY)).toHaveCount(0);
});
