/**
 * Bridges DYA Studio's notification subscriptions to the Abyss adapter.
 *
 * `RpcConnection.notification_readable` permits a single reader, and
 * `useZMKApp` takes it for the lifetime of the connection so the app can react
 * to lock-state and keymap-change notifications. The adapter therefore cannot
 * read the stream itself: its `getReader()` throws, `loadZmkPreview` swallows
 * that via a `.catch()`, and every trackball / runtime input processor
 * disappears from the import with no error to explain it.
 *
 * `ZmkNotificationSource` is the adapter's escape hatch for exactly this. We
 * re-broadcast what the app is already receiving.
 */
import type { ZmkNotificationSource } from "@keyboard-hub/adapter-zmk";
import type { Notification as StudioNotification } from "@zmkfirmware/zmk-studio-ts-client/studio";
import type { CustomNotification } from "@zmkfirmware/zmk-studio-ts-client/custom";

/** The slice of `UseZMKAppReturn` this needs. */
export interface NotificationBridgeInput {
  /** Custom subsystem indices to relay. */
  subsystemIndexes: number[];
  /** `zmkApp.onNotification`, returning an unsubscribe. */
  onNotification: (subscription: {
    type: "custom";
    subsystemIndex: number;
    callback: (notification: CustomNotification) => void;
  }) => () => void;
}

/**
 * Builds a notification source over every advertised custom subsystem.
 *
 * The app subscribes per subsystem index, while the adapter wants the outer
 * Studio envelope and does its own index filtering — so each notification is
 * rewrapped on the way through. Subscribing to all advertised subsystems keeps
 * this independent of which one the adapter happens to be interested in.
 */
export function createAbyssNotificationSource({
  subsystemIndexes,
  onNotification,
}: NotificationBridgeInput): ZmkNotificationSource & { dispose: () => void } {
  // The adapter sends listInputProcessors before subscribing. Firmware can
  // deliver its notifications before the request resolves, so start listening
  // before the load and replay those early responses to the collector.
  const buffered: StudioNotification[] = [];
  const listeners = new Set<(notification: StudioNotification) => void>();
  const unsubscribes = subsystemIndexes.map((subsystemIndex) =>
    onNotification({
      type: "custom",
      subsystemIndex,
      callback: (customNotification) => {
        const notification = {
          custom: { customNotification },
        } as StudioNotification;
        if (listeners.size === 0) buffered.push(notification);
        else listeners.forEach((listener) => listener(notification));
      },
    }),
  );
  return {
    subscribe(listener) {
      listeners.add(listener);
      buffered.splice(0).forEach((notification) => listener(notification));
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      unsubscribes.splice(0).forEach((unsubscribe) => unsubscribe());
      buffered.length = 0;
      listeners.clear();
    },
  };
}
