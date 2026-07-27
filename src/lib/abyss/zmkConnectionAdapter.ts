/**
 * Adapts DYA Studio's live ZMK Studio connection into the shape
 * `@keyboard-hub/adapter-zmk` expects.
 *
 * The adapter is built to own its connection: `zmkAdapter.connect()` opens a
 * transport, creates the RPC connection, and hands back a `ZmkConnection`. DYA
 * Studio already has all of that, and ZMK Studio permits one connection at a
 * time — opening a second would mean disconnecting the user first. So we wrap
 * what we have instead.
 *
 * This is the only module allowed to fabricate a `ZmkConnection`. Keeping the
 * casts here means the rest of the app deals in the adapter's real types.
 */
import type {
  ZmkConnection,
  ZmkNotificationSource,
} from "@keyboard-hub/adapter-zmk";
import type { RpcConnection } from "@zmkfirmware/zmk-studio-ts-client";
import type { ConnectionMethod } from "../../components/DeviceConnection";

/**
 * Placeholder for the transport the adapter is not allowed to touch.
 *
 * `transportConnection` is required by `ZmkConnection`, but DYA Studio owns the
 * transport and must not hand it over — the adapter closing it would kill the
 * user's session. Nothing in the adapter's load or writeback paths reads it.
 *
 * This was briefly a Proxy that threw on any access, to turn a future misuse
 * into a loud error. That broke the app: the loaded connection is stored in
 * React state, and something in the render path introspects state objects, so
 * the throw fired during rendering and silently froze the whole subtree —
 * every button on the page stopped responding after the first device read.
 * A plain frozen object is worth more than a tripwire that maims the host.
 */
const UNAVAILABLE_TRANSPORT = Object.freeze(
  {},
) as ZmkConnection["transportConnection"];

/** Maps a DYA Studio connection method onto the adapter's transport label. */
function transportOf(method: ConnectionMethod): ZmkConnection["transport"] {
  return method === "ble" ? "ble" : "usb";
}

export interface AbyssZmkConnectionInput {
  /** The live RPC connection from `ZMKAppContext`. */
  rpcConnection: RpcConnection;
  /** Device name from the Studio handshake, shown in import previews. */
  deviceName?: string;
  /** How the user connected. Only affects the adapter's display label. */
  method: ConnectionMethod;
  /**
   * Fan-out over notifications the app already receives.
   *
   * Required in practice: `notification_readable` allows one reader and
   * `useZMKApp` holds it for the lifetime of the connection, so without this
   * the adapter's own `getReader()` throws, `loadZmkPreview` swallows it, and
   * every trackball / runtime input processor silently disappears from the
   * import.
   */
  notificationSource?: ZmkNotificationSource;
}

/** Wraps DYA Studio's connection so the Abyss adapter can read and write it. */
export function createAbyssZmkConnection({
  rpcConnection,
  deviceName,
  method,
  notificationSource,
}: AbyssZmkConnectionInput): ZmkConnection {
  return {
    method: "zmk",
    transport: transportOf(method),
    deviceName,
    rpcConnection,
    // The adapter never aborts this; DYA Studio owns the connection lifecycle.
    rpcAbortController: new AbortController(),
    transportConnection: UNAVAILABLE_TRANSPORT,
    notificationSource,
    // Disconnecting is the app's decision, not the adapter's.
    disconnect: () => {},
  };
}
