import { useContext, useEffect, useState } from "react";
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
  useEffect(() => {
    if (!open || !connection || !deviceName) return;
    const controller = new AbortController();
    void findAbyssKeyboardUrl(deviceName, controller.signal)
      .then((url) => {
        if (!controller.signal.aborted)
          setResult({ connection, name: deviceName, url });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResult({ connection, name: deviceName, url: abyssDiscoverUrl() });
      });
    return () => controller.abort();
  }, [open, connection, deviceName]);
  return result &&
    result.connection === connection &&
    result.name === deviceName
    ? result.url
    : abyssDiscoverUrl();
}
