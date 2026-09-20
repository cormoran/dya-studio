import type { ConnectionMethod } from "../contexts/DeviceConnectionContext";

const CONNECTION_METHOD_STORAGE_KEY = "dya-studio:connection-method";

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    // Storage is best-effort. The normal connect screen still works in a
    // sandboxed iframe or privacy mode where it is unavailable.
    return null;
  }
}

/** The connection method that can be safely resumed after a page reload. */
export function savedConnectionMethod(): ConnectionMethod | null {
  const method = storage()?.getItem(CONNECTION_METHOD_STORAGE_KEY);
  return method === "demo" || method === "serial" ? method : null;
}

/**
 * Save a successfully connected method for this browser tab. BLE is excluded:
 * the browser picker must be opened by a user gesture, so retrying it during a
 * reload would only leave the splash screen in a failed state.
 */
export function saveConnectionMethod(method: ConnectionMethod): void {
  if (method !== "demo" && method !== "serial") return;
  storage()?.setItem(CONNECTION_METHOD_STORAGE_KEY, method);
}

export function clearSavedConnectionMethod(): void {
  storage()?.removeItem(CONNECTION_METHOD_STORAGE_KEY);
}
