import { useCallback, useEffect, useRef, useState } from "react";
import { useCustomSubsystem } from "./useCustomSubsystem";
import {
  Request,
  Response,
  type Config,
  type State,
  type GlobalResponse,
} from "../proto/cormoran/runtime_tapdance/runtime_tapdance";
import { TAP_DANCE_ACTIONS } from "../lib/runtimeTapDance";

export const RUNTIME_TAP_DANCE_IDENTIFIER = "cormoran__runtime_tapdance";
const codec = {
  encode: (request: Request) => Request.encode(request).finish(),
  decode: Response.decode,
};
const UPDATE_REQUIRED =
  "Update the runtime tapdance firmware to use named tapdances and shared pool allocation.";

export function useRuntimeTapDance(active = true) {
  const { subsystem, ready, call } = useCustomSubsystem(
    RUNTIME_TAP_DANCE_IDENTIFIER,
    codec,
  );
  const [entries, setEntries] = useState<State[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalResponse | null>(
    null,
  );
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const rpc = useCallback(
    async (request: Request): Promise<Response> => {
      if (!ready) throw new Error("Runtime tapdance subsystem is unavailable.");
      const response = await call(request);
      if (response?.error)
        throw new Error(
          request.getGlobal && [-95, -38].includes(response.error.code)
            ? UPDATE_REQUIRED
            : response.error.message,
        );
      if (!response) throw new Error("Firmware returned no tapdance response.");
      return response;
    },
    [call, ready],
  );
  const readGlobal = useCallback(async () => {
    const response = await rpc(Request.create({ getGlobal: {} }));
    if (response.global?.apiVersion !== 2) throw new Error(UPDATE_REQUIRED);
    setGlobalSettings(response.global);
    return response.global;
  }, [rpc]);
  const readEntries = useCallback(async () => {
    const settings = await readGlobal();
    const loaded: State[] = [];
    const seen = new Set<number>();
    let afterId = 0;
    let hasAfterId = false;
    for (;;) {
      const response = await rpc(
        Request.create({ list: { afterId, hasAfterId } }),
      );
      if (!response.list)
        throw new Error("Firmware returned no tapdance list.");
      for (const summary of response.list.entries) {
        if (seen.has(summary.index) || loaded.length >= settings.maxEntries)
          throw new Error("Invalid tapdance list pagination.");
        seen.add(summary.index);
        const detail = await rpc(
          Request.create({ get: { index: summary.index } }),
        );
        if (!detail.state?.config || detail.state.index !== summary.index)
          throw new Error("Firmware returned no tapdance state.");
        loaded.push(detail.state);
      }
      if (!response.list.hasMore) break;
      if (
        !response.list.entries.length ||
        (hasAfterId && response.list.nextAfterId <= afterId)
      )
        throw new Error("Invalid tapdance list pagination.");
      afterId = response.list.nextAfterId;
      hasAfterId = true;
    }
    setEntries(loaded.sort((a, b) => a.index - b.index));
  }, [readGlobal, rpc]);
  const load = useCallback(async () => {
    if (!ready || inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await readEntries();
      setRevision((value) => value + 1);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [readEntries, ready]);
  const run = async <T>(
    operation: () => Promise<T>,
    resetDrafts = false,
  ): Promise<T | null> => {
    if (!ready || globalSettings?.apiVersion !== 2 || inFlight.current)
      return null;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const value = await operation();
      await readEntries();
      if (resetDrafts) setRevision((current) => current + 1);
      return value;
    } catch (reason) {
      // Keep local drafts available for retry. Reload metadata only: a partial
      // Set sequence may have changed RAM, so global Save/Discard must see dirty.
      try {
        await readGlobal();
      } catch {
        /* Preserve the original failure. */
      }
      setError(
        `Tapdance operation failed; some changes may already be applied. Refresh before retrying. ${reason instanceof Error ? reason.message : String(reason)}`,
      );
      return null;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const stateOf = (response: Response) => {
    if (!response.state?.config)
      throw new Error("Firmware returned no tapdance state.");
    setEntries((current) =>
      [
        ...current.filter((entry) => entry.index !== response.state!.index),
        response.state!,
      ].sort((a, b) => a.index - b.index),
    );
    return response.state;
  };
  const statusOf = (response: Response) => {
    if (!response.status)
      throw new Error("Firmware returned no tapdance status.");
    return true;
  };
  const create = async (name: string): Promise<number | null> =>
    run(
      async () =>
        stateOf(
          await rpc(
            Request.create({ create: { name: name.trim(), persist: false } }),
          ),
        ).index,
    );
  const rename = async (index: number, name: string): Promise<boolean> =>
    (await run(async () => {
      stateOf(
        await rpc(
          Request.create({
            rename: { index, name: name.trim(), persist: false },
          }),
        ),
      );
      return true;
    })) === true;
  const save = async (
    index: number,
    config: Config,
    persist = true,
  ): Promise<boolean> =>
    (await run(async () => {
      const actions = [...TAP_DANCE_ACTIONS.entries()].sort(
        ([a, fieldA], [b, fieldB]) => {
          const aSet = !!config[fieldA]?.behaviorId,
            bSet = !!config[fieldB]?.behaviorId;
          return aSet === bSet ? (aSet ? a - b : b - a) : aSet ? 1 : -1;
        },
      );
      for (const [action, field] of actions)
        stateOf(
          await rpc(
            Request.create({
              set: {
                index,
                tapCount: action + 1,
                binding: config[field],
                persist: false,
              },
            }),
          ),
        );
      return !persist || statusOf(await rpc(Request.create({ save: {} })));
    })) === true;
  const remove = async (index: number) =>
    (await run(
      async () => statusOf(await rpc(Request.create({ delete: { index } }))),
      true,
    )) === true;
  const saveInterval = async (intervalMs: number, persist = false) =>
    (await run(async () => {
      const response = await rpc(
        Request.create({ setInterval: { intervalMs, persist } }),
      );
      if (!response.global)
        throw new Error("Firmware returned no tapdance global settings.");
      return true;
    })) === true;
  const saveChanges = async () =>
    (await run(async () =>
      statusOf(await rpc(Request.create({ save: {} }))),
    )) === true;
  const discardChanges = async () =>
    (await run(
      async () => statusOf(await rpc(Request.create({ discard: {} }))),
      true,
    )) === true;
  const loadedFor = useRef<number | undefined>(undefined);
  const index = subsystem?.index;
  useEffect(() => {
    if (!ready) {
      loadedFor.current = undefined;
      setEntries([]);
      setGlobalSettings(null);
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
    entries,
    globalSettings,
    intervalMs: globalSettings?.intervalMs ?? 200,
    hasUnsavedChanges:
      !!globalSettings?.hasUnsavedChanges ||
      entries.some((entry) => entry.hasUnsavedChanges),
    revision,
    busy,
    error,
    load,
    create,
    rename,
    save,
    remove,
    saveInterval,
    saveChanges,
    discardChanges,
  };
}
export type RuntimeTapDance = ReturnType<typeof useRuntimeTapDance>;
