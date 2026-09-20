import { test, expect } from "@playwright/test";
import { connect, DEVICE_NAME } from "../support/connect";

test("dya-studio (real app) fully connects to real firmware in Renode over WebSerial", async ({
  page,
}) => {
  // The shared flow asserts the fully connected header and hidden USB button.
  await connect(page);

  // Independently verify that the firmware reply reached the shimmed serial
  // stream, rather than only checking the rendered device name.
  await expect
    .poll(() => page.evaluate(() => (window as any).__SHIM_RX__ || ""), {
      timeout: 60_000,
      message: `firmware GetDeviceInfo reply ("${DEVICE_NAME}") never reached the browser over WebSerial`,
    })
    .toContain(DEVICE_NAME);
});
