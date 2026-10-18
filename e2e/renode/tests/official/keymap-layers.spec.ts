import { test, expect, type Page } from "@playwright/test";
import { connect, openKeymap, layerTabs } from "../support/connect";

// Layer-management coverage for the OFFICIAL ZMK firmware in Renode, all via the
// core ZMK Studio keymap.* RPCs (reorder / rename / remove+restore layers) plus
// the physical-layout surface. Every op here is stock protocol — no fork.
//
// DUT: the renode_tester shield keymap defines FOUR named layers
//   Base / Lower / Raise / Adjust
// (display-name on each layer node), so there are ≥2 layers to reorder, rename,
// and delete+restore. (The stock single-layer renode_tester keymap can't
// exercise these: ZMK's layer capacity == the number of DT layer nodes, so with
// one layer node Add/Delete/Move are all disabled — see this task's report.)
//
// ISOLATION: run-local boots ONE firmware and runs specs in sequence, so device
// state persists. Each test is written to be NET-ZERO on the device — it reverts
// its own structural change (move back / delete the last layer then restore it
// to the same end slot / rename back) — and every test gets a fresh page+connect
// (so the app re-reads device state), leaving a clean baseline for the next.

const BASE_LAYERS = ["Base", "Lower", "Raise", "Adjust"];

async function layerNames(page: Page): Promise<string[]> {
  return layerTabs(page).allInnerTexts();
}

// Wait until the layer-tab row matches an expected ordered list of names. Uses
// expect.poll so it retries while the keymap.* RPC round-trip settles.
async function expectLayerOrder(page: Page, expected: string[]) {
  await expect
    .poll(() => layerNames(page), { timeout: 15_000 })
    .toEqual(expected);
}

test.describe("dya-studio Keymap: layer management over official ZMK core RPCs", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180_000);
    await connect(page);
    await openKeymap(page);
    // Baseline sanity: the four DT-defined layers render in order.
    await expectLayerOrder(page, BASE_LAYERS);
  });

  test("reorders layers (move up / move down) via keymap.moveLayer", async ({
    page,
  }) => {
    // Select "Lower" (index 1) and move it UP one slot. The moveLayer RPC
    // returns the reordered keymap; the tab row must reflect the new order and
    // the app must flag the edit as unsaved.
    await layerTabs(page).nth(1).click();
    await page
      .getByRole("button", { name: "Edit layers", exact: true })
      .click();
    const handle = page.getByRole("button", {
      name: "Reorder layer Lower",
      exact: true,
    });
    await handle.press("ArrowLeft");
    await expectLayerOrder(page, ["Lower", "Base", "Raise", "Adjust"]);
    await expect(
      page.getByText("Unsaved changes", { exact: true }),
    ).toBeVisible();

    // Move it back DOWN → original order restored (net-zero for the device).
    await expect(handle).toHaveAttribute("aria-disabled", "false");
    await handle.press("ArrowRight");
    await expectLayerOrder(page, BASE_LAYERS);
    await page
      .getByRole("button", { name: "Finish editing", exact: true })
      .click();
  });

  test("renames a layer via keymap.setLayerProps", async ({ page }) => {
    const NEW_NAME = "Symbols";

    // Open the rename dialog for the selected layer (index 0 = "Base").
    await layerTabs(page).nth(0).click();
    await page
      .getByRole("button", { name: "Edit layers", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Rename layer Base", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Rename Layer")).toBeVisible();

    // Replace the name and confirm → setLayerProps RPC.
    const input = dialog.getByPlaceholder("Layer name");
    await input.fill(NEW_NAME);
    await dialog.getByRole("button", { name: "Rename", exact: true }).click();
    await expect(dialog).toBeHidden();

    // The tab label reflects the new name and the edit is unsaved.
    await expectLayerOrder(page, [NEW_NAME, "Lower", "Raise", "Adjust"]);
    await expect(
      page.getByText("Unsaved changes", { exact: true }),
    ).toBeVisible();

    // Rename back to "Base" so the device is left at baseline (net-zero).
    // Edit-mode layer buttons are not selectors; target the named action.
    await page
      .getByRole("button", { name: `Rename layer ${NEW_NAME}`, exact: true })
      .click();
    await dialog.getByPlaceholder("Layer name").fill("Base");
    await dialog.getByRole("button", { name: "Rename", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expectLayerOrder(page, BASE_LAYERS);
    await page
      .getByRole("button", { name: "Finish editing", exact: true })
      .click();
  });

  test("deletes a layer then restores it (keymap.removeLayer + restoreLayer)", async ({
    page,
  }) => {
    // Delete the LAST layer ("Adjust", index 3). Deleting the last slot makes
    // this net-zero: restore re-appends at the end == its original position.
    await layerTabs(page).nth(3).click();
    await page
      .getByRole("button", { name: "Edit layers", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Delete layer Adjust", exact: true })
      .click(); // confirm() auto-accepted in connect()

    // The layer is gone from the tab row and the edit is unsaved.
    await expectLayerOrder(page, ["Base", "Lower", "Raise"]);
    await expect(
      page.getByText("Unsaved changes", { exact: true }),
    ).toBeVisible();

    // Restore it: the restore button lists the device's removed (restorable)
    // layers — ZMK keeps the removed layer's bindings+name until saved, so it
    // can be brought back. Pick the single removed entry (row after the
    // "restore all" header).
    const restore = page.getByRole("button", { name: "Restore deleted layer" });
    await expect(restore).toBeEnabled();
    await restore.click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem")).toHaveCount(2); // "restore all" + the one removed layer
    await menu.getByRole("menuitem").nth(1).click();

    // restoreLayer brought "Adjust" back at the end, name preserved → baseline.
    await expectLayerOrder(page, BASE_LAYERS);
    await page
      .getByRole("button", { name: "Finish editing", exact: true })
      .click();
  });

  test("physical-layout selector reflects the single layout this DUT exposes", async ({
    page,
  }) => {
    // The dya-studio physical-layout picker only renders when the device
    // exposes >1 physical layout (KeymapPage gates it on layouts.length > 1).
    // The renode_tester shield defines a single physical layout, so no picker is
    // shown — assert its absence (proving one layout) rather than faking a
    // multi-layout switch. The keymap itself is loaded (grid painted), so this
    // is a positive "single layout" assertion, not a "not-loaded" false pass.
    await expect(layerTabs(page).first()).toBeVisible();
    await expect(page.getByText("Physical Layout:")).toHaveCount(0);
    // NOTE: switching physical layouts (keymap.setActivePhysicalLayout) cannot
    // be exercised on this DUT — it has only one layout. See the task report.
  });
});
