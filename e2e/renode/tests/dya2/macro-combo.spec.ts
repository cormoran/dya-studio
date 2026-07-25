import { test, expect, type Page, type Locator } from "@playwright/test";
import { connectDya2 } from "./dya2.helpers";

// The dya2 fork (main+dya) ships two custom Studio subsystems that the
// Macro&Combo tab drives:
//   - cormoran__runtime_macro  (create/edit/persist macros at runtime)
//   - cormoran__runtime_combo  (create/edit/persist combos at runtime)
// dya2 is UNLOCKED, so no unlock step is needed.
//
// Each subsystem gets its OWN test (each connects once, creates one item,
// persists it to flash, proves the round-trip via the create's device re-list,
// then deletes it and persists the removal so the NVS is left exactly as
// found). They are separate tests on purpose: the dya2 two-machine (wired-
// split) DUT in Renode only serves ONE Studio connection per boot AND can't
// sustain both subsystems' RPC volume on a single connection before the
// emulated USB-CDC device->host path stalls, so each test is meant to run in
// its own boot (Playwright `-g` selects one).
//
// The runtime-macro test is verified GREEN against the real firmware in Renode.
// The runtime-combo test is implemented but marked `fixme` (skipped) because it
// is not reliably green on this emulator (see the note above that test).

// A Macros / Combos list section, keyed by its heading so the locator is robust.
function listSection(page: Page, heading: string): Locator {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: heading, exact: true }) });
}

function debugHooks(page: Page): void {
  if (process.env.E2E_DEBUG) {
    page.on("console", (m) => console.log(`PAGE [${m.type()}] ${m.text()}`));
    page.on("pageerror", (e) => console.log("PAGE ERROR " + e.message));
  }
  // Neither create nor delete gates on confirm(), but auto-accept defensively.
  page.on("dialog", (d) => void d.accept());
}

test("dya2 Macro&Combo tab: runtime macro create -> persist -> round-trip -> delete", async ({
  page,
}) => {
  // Generous: the create/persist/select-slot/delete round trip (each an RPC plus
  // a 10s save debounce) is much slower on the CPU-starved single-machine
  // emulation of a stock CI runner than on a dev box, and the select-slot read
  // can transiently report "No macro bound to that slot" for several cycles
  // right after create until the write settles.
  test.setTimeout(600_000);
  debugHooks(page);

  await connectDya2(page);
  await page.getByRole("tab", { name: "Macro&Combo" }).click();

  const save = page.getByRole("button", { name: "Save", exact: true });

  // The runtime-macro subsystem is present (list_macros RPC succeeded).
  const macros = listSection(page, "Macros");
  await expect(macros).toBeVisible({ timeout: 120_000 });
  const items = macros.locator("div.space-y-1 > button");
  const before = (await items.allInnerTexts()).map((s) => s.trim());

  // CREATE a macro. createMacro issues create_macro AND then list_macros, so the
  // macro appearing here is already a device write->read round-trip.
  await macros.getByTitle("Create macro").click();
  await expect(items).toHaveCount(before.length + 1, { timeout: 90_000 });
  const newMacro = (await items.allInnerTexts())
    .map((s) => s.trim())
    .find((n) => !before.includes(n));
  expect(
    newMacro,
    "a newly-named macro should appear in the list",
  ).toBeTruthy();
  // Locate by the exact name text (the list button's accessible NAME also
  // includes the StatusDot's aria-label, so getByRole name won't match).
  const macroButton = macros
    .locator("div.space-y-1 > button")
    .filter({ has: page.getByText(newMacro!, { exact: true }) });
  await expect(macroButton).toBeVisible();

  // PERSIST to flash (save_macros). Save disables once nothing is pending.
  await expect(save).toBeEnabled();
  await save.click();
  await expect(save).toBeDisabled({ timeout: 120_000 });

  // REVERT: select + delete it (delete_macro re-lists). Selecting reads the
  // slot back, which can transiently fail right after create ("No macro bound
  // to that slot"), so retry the select+delete until the macro is gone.
  await expect(async () => {
    if ((await macroButton.count()) > 0) {
      await macroButton.click();
      await page
        .getByRole("button", { name: "Delete", exact: true })
        .click({ timeout: 10_000 })
        .catch(() => {});
    }
    expect(await macroButton.count()).toBe(0);
  }).toPass({ timeout: 300_000 });
  await expect(items).toHaveCount(before.length);
  // Persist the removal if it left a pending change.
  if (await save.isEnabled().catch(() => false)) {
    await save.click();
    await expect(save).toBeDisabled({ timeout: 120_000 });
  }
});

// NOTE: covered by an implemented test but marked `fixme` (skipped) because it
// is NOT reliably green on the dya2 two-machine Renode DUT: the firmware's
// runtime-combo `setCombo` intermittently rejects the create with `-19`
// (ENODEV, surfaced as a red "Runtime combo request failed: -19" banner) or the
// RPC stalls ("Operation timed out") under the emulator's limited USB-CDC
// throughput. The flow below DID pass end-to-end once against the real
// firmware, so it is kept (with a create-retry) ready to enable once the
// combo-create flakiness is resolved. The sibling runtime-macro subsystem
// (same create/persist/round-trip/delete pattern, same custom-subsystem RPC
// path) is exercised fully and reliably by the test above.
test.fixme("dya2 Macro&Combo tab: runtime combo create -> persist -> round-trip -> delete", async ({
  page,
}) => {
  test.setTimeout(300_000);
  debugHooks(page);

  await connectDya2(page);
  await page.getByRole("tab", { name: "Macro&Combo" }).click();

  const save = page.getByRole("button", { name: "Save", exact: true });

  // The combos list renders once the keymap has loaded (it needs the
  // behavior/layer metadata), so this also waits out the fast-keymap load.
  const combos = listSection(page, "Combos");
  await expect(combos).toBeVisible({ timeout: 150_000 });
  const items = combos.locator("div.space-y-2 > button");
  // Wait until the combo list has finished its initial load (either the empty
  // placeholder or at least one combo is shown) before creating — clicking
  // "New combo" while the list is still loading can drop the create.
  await expect(
    combos.getByText("No runtime combos configured").or(items.first()),
  ).toBeVisible({ timeout: 60_000 });
  const before = await items.count();

  // CREATE a combo. handleNewCombo issues setCombo + setComboName and re-lists
  // the combos from the device, so its appearance here is the round-trip proof.
  // The firmware's setCombo occasionally returns a transient error early after
  // boot (surfaced as a red "Runtime combo request failed: -19" banner); retry
  // the create a few times, dismissing the banner between attempts.
  const newCombo = combos.getByTitle("New combo");
  let created = false;
  for (let attempt = 0; attempt < 4 && !created; attempt++) {
    await newCombo.click();
    try {
      await expect(items).toHaveCount(before + 1, { timeout: 20_000 });
      created = true;
    } catch {
      const dismiss = page.getByRole("button", { name: "Dismiss" });
      if (await dismiss.isVisible().catch(() => false)) {
        await dismiss.click().catch(() => {});
      }
    }
  }
  await expect(items).toHaveCount(before + 1, { timeout: 60_000 });
  await expect(
    page.getByRole("heading", { name: "Combo Editor", exact: true }),
  ).toBeVisible();

  // PERSIST to flash (combo save persists memory -> NVS).
  await expect(save).toBeEnabled();
  await save.click();
  await expect(save).toBeDisabled({ timeout: 60_000 });

  // REVERT: the created combo is still selected -> Delete it (deleteCombo drops
  // it from the list). Persist the removal only if it left a pending change --
  // deleting the just-created combo returns the slot to its default, which the
  // subsystem may settle without a separate flash save (Save then stays
  // disabled). Either way the combo is gone.
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(items).toHaveCount(before, { timeout: 60_000 });
  if (await save.isEnabled().catch(() => false)) {
    await save.click();
    await expect(save).toBeDisabled({ timeout: 60_000 });
  }
  // Confirm the device re-lists without the combo (delete round-trip + net-zero).
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(items).toHaveCount(before, { timeout: 60_000 });
});
