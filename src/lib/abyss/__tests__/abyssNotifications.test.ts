/**
 * Tests for the notification fan-out handed to the Abyss adapter.
 *
 * This bridge is the difference between the adapter seeing runtime input
 * processors and silently reporting none, so the shape it produces has to match
 * what the adapter unwraps.
 */
import type { CustomNotification } from "@zmkfirmware/zmk-studio-ts-client/custom";
import { createAbyssNotificationSource } from "../abyssNotifications";

function customNotification(subsystemIndex: number): CustomNotification {
  return { subsystemIndex, payload: new Uint8Array([1]) } as CustomNotification;
}

describe("createAbyssNotificationSource", () => {
  it("subscribes to every advertised subsystem", () => {
    const onNotification = jest.fn(() => () => {});

    createAbyssNotificationSource({
      subsystemIndexes: [0, 2, 5],
      onNotification,
    }).subscribe(() => {});

    expect(onNotification).toHaveBeenCalledTimes(3);
    expect(onNotification.mock.calls.map(([s]) => s.subsystemIndex)).toEqual([
      0, 2, 5,
    ]);
  });

  it("rewraps custom notifications into the Studio envelope", () => {
    // The app subscribes per subsystem and receives the inner payload, but the
    // adapter reads `notification.custom.customNotification` and filters by
    // index itself.
    let deliver: ((notification: CustomNotification) => void) | undefined;
    const source = createAbyssNotificationSource({
      subsystemIndexes: [3],
      onNotification: ({ callback }) => {
        deliver = callback;
        return () => {};
      },
    });

    const received: unknown[] = [];
    source.subscribe((notification) => received.push(notification));
    deliver?.(customNotification(3));

    expect(received).toEqual([
      { custom: { customNotification: customNotification(3) } },
    ]);
  });

  it("unsubscribes from every subsystem", () => {
    const unsubscribes = [jest.fn(), jest.fn()];
    let call = 0;
    const source = createAbyssNotificationSource({
      subsystemIndexes: [0, 1],
      onNotification: () => unsubscribes[call++],
    });

    source.subscribe(() => {})();

    expect(unsubscribes[0]).toHaveBeenCalledTimes(1);
    expect(unsubscribes[1]).toHaveBeenCalledTimes(1);
  });
});
