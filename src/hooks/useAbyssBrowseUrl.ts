import { useContext, useEffect, useRef, useState } from "react";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import {
  abyssDiscoverUrl,
  findAbyssKeyboardUrl,
} from "../lib/abyss/abyssCatalog";

/** Resolve only when the menu opens; independent of authentication/owned keymaps. */
export function useAbyssBrowseUrl(open: boolean) {
  const app = useContext(ZMKAppContext);
  const deviceName = app?.state.deviceInfo?.name;
  const connection = app?.state.connection;
  const [result, setResult] = useState<{
    connection: unknown;
    name: string;
    url: string;
  } | null>(null);
  const controller = useRef<AbortController | null>(null);
  const pending = useRef<AbortSignal | null>(null);
  useEffect(() => {
    const next = new AbortController();
    controller.current = next;
    return () => next.abort();
  }, [connection, deviceName]);
  useEffect(() => {
    if (!open || !connection || !deviceName) return;
    if (result?.connection === connection && result.name === deviceName) return;
    const signal = controller.current!.signal;
    if (pending.current === signal) return;
    pending.current = signal;
    void findAbyssKeyboardUrl(deviceName, signal)
      .then((url) => {
        if (!signal.aborted) setResult({ connection, name: deviceName, url });
      })
      .catch(() => {
        if (!signal.aborted)
          setResult({ connection, name: deviceName, url: abyssDiscoverUrl() });
      });
  }, [open, connection, deviceName, result]);
  return result &&
    result.connection === connection &&
    result.name === deviceName
    ? result.url
    : abyssDiscoverUrl();
}
