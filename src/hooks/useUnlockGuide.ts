import { useContext, useEffect, useMemo, useState } from "react";
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
  // findSubsystem returns a new descriptor on every render. Depend on its
  // connection-scoped index, otherwise setLoaded starts the read again forever.
  const subsystemIndex = subsystem?.index ?? null;
  const [loaded, setLoaded] = useState<{
    connection: typeof connection;
    model: FastKeymapModel;
    subsystemIndex: number;
  } | null>(null);
  useEffect(() => {
    if (!open || !connection || subsystemIndex === null || !ready) return;
    let cancelled = false;
    void loadFastKeymap(call, { deviceKey })
      .then((model) => {
        if (!cancelled) setLoaded({ connection, subsystemIndex, model });
      })
      .catch(() => {
        // Unsupported/secured RPCs and read failures retain the generic steps.
        if (!cancelled) setLoaded(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, connection, subsystemIndex, ready, call, deviceKey]);
  return useMemo(() => {
    if (
      !open ||
      !loaded ||
      !ready ||
      loaded.connection !== connection ||
      loaded.subsystemIndex !== subsystemIndex
    )
      return null;
    const steps = findUnlockGuide(loaded.model);
    return steps ? { model: loaded.model, steps } : null;
  }, [open, loaded, ready, connection, subsystemIndex]);
}
