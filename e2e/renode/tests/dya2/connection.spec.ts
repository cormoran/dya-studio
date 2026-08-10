import { test, expect, type Page, type Locator } from "@playwright/test";
import { connectDya2 } from "./dya2.helpers";

// The dya2 fork (main+dya) ships the connection-info subsystems that the
// Connection tab drives:
//   - cormoran_ble             (ble-management: BLE profile list, output prio)
//   - cormoran__os_detection   (per-connection detected/effective OS)
//   - cormoran__default_layer  (per-connection + per-OS default layers)
// dya2 is UNLOCKED, so no unlock step is needed. The DUT is booted as a
// two-machine WIRED split (a peripheral is present) and the Studio link runs
// over USB, so the page renders whatever real connection state the firmware
// reports; this spec asserts on what actually renders rather than fixed values.
//
// This spec proves the connection-info read path (the page paints its default-
// layer / per-OS / connection cards, which only appear once the default-layer
// getState + os-detection + ble-management reads have all returned) and then a
// SAFE default-layer WRITE round-trip: it picks an enabled "... default layer"
// <select>, changes it to a different layer, verifies the change round-trips via
// the firmware's refreshed StateResponse (the setOsLayer/setEndpointLayer RPC
// returns the full state, which re-drives the controlled <select>), then REVERTS
// to the original — net-zero. It deliberately avoids destructive BLE actions
// (no unpair/switch/output-priority change) so the Studio link can't drop.

// All default-layer <select>s (per-connection endpoints AND per-OS rows) carry
// an aria-label ending in "default layer"; the OS-override selects end in "OS
// override" and are excluded.
function layerSelects(page: Page): Locator {
  return page.locator('select[aria-label$="default layer"]');
}

test("dya2 Connection tab: reads connection info and round-trips (+reverts) a safe default-layer write", async ({
  page,
}) => {
  test.setTimeout(300_000);
  if (process.env.E2E_DEBUG) {
    page.on("console", (m) => console.log(`PAGE [${m.type()}] ${m.text()}`));
    page.on("pageerror", (e) => console.log("PAGE ERROR " + e.message));
  }
  page.on("dialog", (d) => void d.accept());

  await connectDya2(page);

  // Open the Connection tab.
  await page.getByRole("tab", { name: "Connection" }).click();

  // 1) The connection info RENDERS: the page header + the Per-OS Default Layers
  //    section (this section only paints once cormoran__default_layer's getState
  //    has returned) + at least one default-layer <select> populated from the
  //    device (proves the default-layer read produced a real layerCount).
  await expect(
    page.getByText("Manage connections, default layers and OS detection"),
  ).toBeVisible({ timeout: 120_000 });
  await expect(
    page.getByText("Per-OS Default Layers", { exact: true }),
  ).toBeVisible({ timeout: 120_000 });

  const selects = layerSelects(page);
  await expect(selects.first()).toBeVisible({ timeout: 120_000 });

  // The connections list rendered at least one card (BLE profile and/or USB).
  // ble-management reports the profile rows; assert a Bluetooth "Profile"/OS
  // card or the USB card is present so the read coverage is explicit.
  await expect(page.locator("div.glass-card:visible").first()).toBeVisible();

  // 2) Pick an ENABLED default-layer <select> that exposes at least two real
  //    layer options (value >= 0), so we have a distinct target to write.
  //    RETRY the scan: the LayerSelects are `disabled={defaultLayer.isLoading}`
  //    and their options come from `state.layerCount`, so a default-layer
  //    getState/refresh in flight momentarily disables every select (and can
  //    render one before its layer options have populated). On a fast DUT the
  //    section can paint while such a refresh is still settling, so a one-shot
  //    scan races it -- wait until a usable select actually appears.
  let chosen: Locator | null = null;
  let layerOptionValues: string[] = [];
  await expect(async () => {
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const s = selects.nth(i);
      if (!(await s.isEnabled())) continue;
      const values = await s
        .locator("option")
        .evaluateAll((opts) =>
          (opts as HTMLOptionElement[]).map((o) => o.value),
        );
      const layers = values.filter((v) => Number(v) >= 0);
      if (layers.length >= 2) {
        chosen = s;
        layerOptionValues = layers;
        return;
      }
    }
    throw new Error(
      "no enabled default-layer select with >= 2 layer options yet",
    );
  }).toPass({ timeout: 60_000 });
  const select = chosen!;
  const label = await select.getAttribute("aria-label");

  // 3) READ the current value, choose a DIFFERENT layer as the write target.
  const originalValue = await select.inputValue();
  const targetValue = layerOptionValues.find((v) => v !== originalValue)!;
  expect(targetValue, "a distinct target layer must exist").toBeTruthy();

  // 4) WRITE + ROUND-TRIP: selecting a value fires setOsLayer/setEndpointLayer,
  //    whose response is the firmware's full refreshed StateResponse. The
  //    controlled <select> only settles on the new value if that device state
  //    actually reports it, so toHaveValue(target) is the round-trip proof.
  await select.selectOption(targetValue);
  await expect(select).toHaveValue(targetValue, { timeout: 60_000 });

  // 5) REVERT to the original value and confirm the device state settles back —
  //    net-zero, so the DUT's NVS is left exactly as found.
  await select.selectOption(originalValue);
  await expect(select).toHaveValue(originalValue, { timeout: 60_000 });

  if (process.env.E2E_DEBUG) {
    console.log(
      `default-layer round-trip on "${label}": ${originalValue} -> ${targetValue} -> ${originalValue}`,
    );
  }
});
