import { useCallback, useEffect, useRef, useState } from "react";
import { useCustomSubsystem } from "./useCustomSubsystem";
import {
  Request,
  Response,
  type Config,
  type State,
} from "../proto/cormoran/runtime_tapdance/runtime_tapdance";
import { TAP_DANCE_ACTIONS } from "../lib/runtimeTapDance";

export const RUNTIME_TAP_DANCE_IDENTIFIER = "cormoran__runtime_tapdance";
const codec = {
  encode: (request: Request) => Request.encode(request).finish(),
  decode: Response.decode,
};

export function useRuntimeTapDance(active = true) {
  const { subsystem, ready, call } = useCustomSubsystem(
    RUNTIME_TAP_DANCE_IDENTIFIER,
    codec,
  );
  const [slots, setSlots] = useState<Config[]>([]);
  const [intervalMs, setIntervalMs] = useState(200);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const rpc = useCallback(
    async (request: Request): Promise<State> => {
      if (!ready) throw new Error("Runtime tapdance subsystem is unavailable");
      const response = await call(request);
      if (response?.error) throw new Error(response.error.message);
      if (!response?.state?.config)
        throw new Error("Firmware returned no tapdance state");
      return response.state;
    },
    [call, ready],
  );
  const load = useCallback(async () => {
    if (!ready || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const first = await rpc(Request.create({ get: { index: 0 } }));
      if (first.maxCount < 1 || first.maxCount > 64)
        throw new Error("Invalid firmware tapdance slot limit");
      const loaded = [first.config!];
      for (let index = 1; index < first.maxCount; index++)
        loaded.push((await rpc(Request.create({ get: { index } }))).config!);
      setSlots(loaded);
      setIntervalMs(first.intervalMs);
      setRevision((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [ready, rpc]);
  const save = async (index: number, config: Config) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      // Each action is a separate firmware transaction. Persist every successful
      // write; a later failure must never be presented as an atomic save.
      const actions = [...TAP_DANCE_ACTIONS.entries()];
      actions.sort(([a, fieldA], [b, fieldB]) => {
        const aSet = !!config[fieldA]?.behaviorId;
        const bSet = !!config[fieldB]?.behaviorId;
        return aSet === bSet ? (aSet ? a - b : b - a) : aSet ? 1 : -1;
      });
      for (const [action, field] of actions) {
        const state = await rpc(
          Request.create({
            set: {
              index,
              tapCount: action + 1,
              binding: config[field],
              persist: true,
            },
          }),
        );
        setSlots((current) =>
          current.map((slot, i) => (i === index ? state.config! : slot)),
        );
      }
      return true;
    } catch (reason) {
      setError(
        `Tapdance save failed; some actions may already be saved. Retry to finish. ${reason instanceof Error ? reason.message : String(reason)}`,
      );
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const remove = async (index: number) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const state = await rpc(
        Request.create({ remove: { index, persist: true } }),
      );
      setSlots((current) =>
        current.map((slot, i) => (i === index ? state.config! : slot)),
      );
      setRevision((value) => value + 1);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const saveInterval = async (value: number) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const state = await rpc(
        Request.create({ setInterval: { intervalMs: value, persist: true } }),
      );
      setIntervalMs(state.intervalMs);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const loadedFor = useRef<number | undefined>(undefined);
  const index = subsystem?.index;
  useEffect(() => {
    if (!ready) {
      loadedFor.current = undefined;
      setSlots([]);
      return;
    }
    if (!active) {
      loadedFor.current = undefined;
      return;
    }
    if (loadedFor.current === index) return;
    loadedFor.current = index;
    void load();
  }, [active, index, load, ready]);
  return {
    isAvailable: subsystem !== null,
    slots,
    intervalMs,
    revision,
    busy,
    error,
    load,
    save,
    remove,
    saveInterval,
  };
}
export type RuntimeTapDance = ReturnType<typeof useRuntimeTapDance>;
