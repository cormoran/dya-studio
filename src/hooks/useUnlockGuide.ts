import { useContext, useEffect, useState } from "react";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import { useCustomSubsystem } from "./useCustomSubsystem";
import {
  loadFastKeymap,
  Request,
  Response,
  type FastKeymapModel,
} from "../lib/fastKeymap";
import { findUnlockGuide } from "../lib/unlockGuide";

const codec = {
  encode: (request: Request) => Request.encode(request).finish(),
  decode: (payload: Uint8Array) => Response.decode(payload),
};

export function useUnlockGuide(open: boolean) {
  const app = useContext(ZMKAppContext);
  const connection = app?.state.connection;
  const deviceKey = app?.state.deviceInfo?.name;
  // Never park the guide's own requests behind the modal it is explaining.
  const { subsystem, ready, call } = useCustomSubsystem(
    "cormoran__fast_keymap",
    codec,
    { unlockGate: false },
  );
  const [loaded, setLoaded] = useState<{
    connection: typeof connection;
    model: FastKeymapModel;
  } | null>(null);
  useEffect(() => {
    if (!open || !connection || !subsystem || !ready) return;
    let cancelled = false;
    void loadFastKeymap(call, { deviceKey })
      .then((model) => {
        if (!cancelled) setLoaded({ connection, model });
      })
      .catch(() => {
        // Unsupported/secured RPCs and read failures retain the generic steps.
        if (!cancelled) setLoaded(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, connection, subsystem, ready, call, deviceKey]);
  if (
    !open ||
    !loaded ||
    !subsystem ||
    !ready ||
    loaded.connection !== connection
  )
    return null;
  const steps = findUnlockGuide(loaded.model);
  return steps ? { model: loaded.model, steps } : null;
}
