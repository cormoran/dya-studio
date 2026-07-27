/**
 * Tests for the bridge between DYA Studio's connection and the Abyss adapter.
 */
import type { RpcConnection } from "@zmkfirmware/zmk-studio-ts-client";
import { createAbyssZmkConnection } from "../zmkConnectionAdapter";

const rpcConnection = { label: "test" } as unknown as RpcConnection;

describe("createAbyssZmkConnection", () => {
  it("passes the live RPC connection straight through", () => {
    const connection = createAbyssZmkConnection({
      rpcConnection,
      deviceName: "DYA2",
      method: "serial",
    });

    // Identity matters: the adapter must drive the same connection the app
    // already owns, not a copy.
    expect(connection.rpcConnection).toBe(rpcConnection);
    expect(connection.method).toBe("zmk");
    expect(connection.deviceName).toBe("DYA2");
  });

  it.each([
    ["serial", "usb"],
    ["demo", "usb"],
    ["ble", "ble"],
  ] as const)("maps the %s method to the %s transport", (method, transport) => {
    expect(createAbyssZmkConnection({ rpcConnection, method }).transport).toBe(
      transport,
    );
  });

  it("hands over an inert transport placeholder", () => {
    const connection = createAbyssZmkConnection({
      rpcConnection,
      method: "serial",
    });

    // This was briefly a Proxy that threw on access. The loaded connection is
    // stored in React state and something in the render path introspects state
    // objects, so the throw fired during rendering and froze the whole page
    // after the first device read. It must be inert, and safe to read.
    expect(() => JSON.stringify(connection.transportConnection)).not.toThrow();
    expect(
      (connection.transportConnection as { label?: string }).label,
    ).toBeUndefined();
    expect(Object.isFrozen(connection.transportConnection)).toBe(true);
  });

  it("never aborts the connection it was handed", () => {
    const connection = createAbyssZmkConnection({
      rpcConnection,
      method: "serial",
    });

    expect(connection.rpcAbortController.signal.aborted).toBe(false);
    // Disconnecting is the app's decision, so this is a no-op rather than a
    // teardown.
    expect(connection.disconnect?.()).toBeUndefined();
  });

  it("carries the notification source through", () => {
    const notificationSource = { subscribe: () => () => {} };
    expect(
      createAbyssZmkConnection({
        rpcConnection,
        method: "serial",
        notificationSource,
      }).notificationSource,
    ).toBe(notificationSource);
  });
});
