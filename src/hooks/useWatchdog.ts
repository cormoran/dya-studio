import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import { useCustomSubsystem } from "./useCustomSubsystem";
import {
  Request,
  Response,
  Notification,
  type Incident,
  type StatusResponse,
} from "../proto/cormoran/watchdog/watchdog";

export const WATCHDOG_SUBSYSTEM_IDENTIFIER = "cormoran__watchdog";

const CODEC = {
  encode: (request: Request) => Request.encode(request).finish(),
  decode: (payload: Uint8Array) => Response.decode(payload),
};

// How long to wait for a split peripheral to answer a relayed request
// before giving up — there is no way to know which peripheral slots are
// connected, so a request to a missing peripheral would hang forever.
const RELAY_TIMEOUT_MS = 3000;

// Safety valve against a misbehaving firmware paginating forever.
const MAX_PAGES = 64;

export interface UseWatchdogReturn {
  isAvailable: boolean;
  /** 0 = central/local, N>0 = split peripheral slot N. */
  source: number;
  setSource: (source: number) => void;
  status: StatusResponse | null;
  incidents: Incident[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deleteOne: (id: number) => Promise<void>;
  deleteAll: () => Promise<void>;
}

export function useWatchdog(): UseWatchdogReturn {
  const zmkApp = useContext(ZMKAppContext);
  // Passive/background watchdog subsystem: opt out of the unlock modal so it
  // never pops on its own; locked reads surface as a section error.
  const { subsystem, ready, call } = useCustomSubsystem(
    WATCHDOG_SUBSYSTEM_IDENTIFIER,
    CODEC,
    { unlockGate: false },
  );
  const [source, setSourceValue] = useState(0);
  const subsystemIndex = subsystem?.index;
  const connection = zmkApp?.state.connection;
  const context = useMemo(
    () => ({ connection, ready, subsystemIndex, source, zmkApp, call }),
    [connection, ready, subsystemIndex, source, zmkApp, call],
  );
  const [state, setState] = useState<{
    context: object;
    status: StatusResponse | null;
    incidents: Incident[];
    isLoading: boolean;
    error: string | null;
  }>({ context, status: null, incidents: [], isLoading: false, error: null });
  const generation = useRef(0);
  const activeContext = useRef<object | null>(context);
  const pendingRelays = useRef(new Set<() => void>());

  const invalidate = useCallback(() => {
    generation.current++;
    for (const cancel of pendingRelays.current) cancel();
    pendingRelays.current.clear();
  }, []);

  const setSource = useCallback(
    (next: number) => {
      if (next === source) return;
      invalidate();
      setState({
        context,
        status: null,
        incidents: [],
        isLoading: false,
        error: null,
      });
      setSourceValue(next);
    },
    [source, context, invalidate],
  );

  // These helpers never publish state: only the current, complete read may do so.
  const awaitPeripheralResponse = useCallback(
    (requestId: number): Promise<Response | null> =>
      new Promise((resolve) => {
        if (!zmkApp || subsystemIndex === undefined) {
          resolve(null);
          return;
        }
        let settled = false;
        const finish = (value: Response | null) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          unsubscribe();
          pendingRelays.current.delete(cancel);
          resolve(value);
        };
        const cancel = () => finish(null);
        const unsubscribe = zmkApp.onNotification({
          type: "custom",
          subsystemIndex,
          callback: (customNotification) => {
            let notification: Notification;
            try {
              notification = Notification.decode(customNotification.payload);
            } catch {
              return;
            }
            const pr = notification.peripheralResponse;
            if (pr && pr.requestId === requestId) finish(pr.response ?? null);
          },
        });
        const timer = setTimeout(() => finish(null), RELAY_TIMEOUT_MS);
        pendingRelays.current.add(cancel);
      }),
    [zmkApp, subsystemIndex],
  );

  const load = useCallback(
    async (deletion?: { ids: number[]; all: boolean }) => {
      if (!ready || activeContext.current !== context) return;
      invalidate();
      const requestGeneration = generation.current;
      const isCurrent = () =>
        activeContext.current === context &&
        generation.current === requestGeneration;
      setState({
        context,
        status: null,
        incidents: [],
        isLoading: true,
        error: null,
      });
      const request = async (req: Request): Promise<Response> => {
        if (!isCurrent()) throw new Error("Obsolete watchdog read");
        let response = await call(req);
        if (!isCurrent()) throw new Error("Obsolete watchdog read");
        if (response?.deferred) {
          response = await awaitPeripheralResponse(response.deferred.requestId);
          if (!response)
            throw new Error(
              `Peripheral did not respond (timed out after ${RELAY_TIMEOUT_MS}ms). It may be disconnected.`,
            );
        }
        if (!isCurrent()) throw new Error("Obsolete watchdog read");
        if (!response) throw new Error("No response from watchdog");
        if (response.error)
          throw new Error(response.error.message || "Watchdog request failed");
        return response;
      };
      try {
        if (deletion) {
          const response = await request(
            Request.create({ deleteIncidents: { ...deletion, source } }),
          );
          if (!response.deleteResult)
            throw new Error("Invalid watchdog deletion response");
        }
        const response = await request(
          Request.create({ getStatus: { source } }),
        );
        if (!response.status)
          throw new Error("Invalid watchdog status response");
        const collected: Incident[] = [];
        let complete = false;
        for (let guard = 0; guard < MAX_PAGES; guard++) {
          const startIndex = collected.length;
          const response = await request(
            Request.create({ listIncidents: { startIndex, source } }),
          );
          const page = response.incidentPage;
          if (!page || page.startIndex !== startIndex)
            throw new Error("Invalid watchdog incident page");
          collected.push(...page.incidents);
          if (collected.length > page.total)
            throw new Error("Invalid watchdog incident total");
          if (collected.length >= page.total) {
            complete = true;
            break;
          }
          if (!page.incidents.length)
            throw new Error("Incomplete watchdog incident list");
        }
        if (!complete) throw new Error("Incomplete watchdog incident list");
        if (isCurrent())
          setState({
            context,
            status: response.status,
            incidents: collected,
            isLoading: false,
            error: null,
          });
      } catch (err) {
        if (isCurrent())
          setState({
            context,
            status: null,
            incidents: [],
            isLoading: false,
            error:
              err instanceof Error ? err.message : "Failed to load incidents",
          });
      }
    },
    [ready, context, invalidate, call, source, awaitPeripheralResponse],
  );

  const refresh = useCallback(() => load(), [load]);

  useEffect(() => {
    activeContext.current = context;
    if (ready) void refresh();
    return () => {
      activeContext.current = null;
      invalidate();
    };
  }, [context, ready, refresh, invalidate]);

  // Central notifications trigger a complete read, with the same invalidation
  // rules as manual refreshes; peripheral notifications cannot alter this view.
  useEffect(() => {
    if (!ready || !zmkApp || subsystemIndex === undefined || source !== 0)
      return;
    return zmkApp.onNotification({
      type: "custom",
      subsystemIndex,
      callback: (customNotification) => {
        if (activeContext.current !== context) return;
        try {
          if (
            Notification.decode(customNotification.payload).incidentRecorded
              ?.incident
          )
            void refresh();
        } catch {
          /* Ignore unrelated/malformed notifications. */
        }
      },
    });
  }, [ready, zmkApp, subsystemIndex, source, context, refresh]);

  const deleteOne = useCallback(
    (id: number) => load({ ids: [id], all: false }),
    [load],
  );
  const deleteAll = useCallback(() => load({ ids: [], all: true }), [load]);
  const currentState =
    state.context === context && ready
      ? state
      : {
          status: null,
          incidents: [],
          isLoading: ready,
          error: null,
        };

  return {
    isAvailable: subsystem !== null,
    source,
    setSource,
    status: currentState.status,
    incidents: currentState.incidents,
    isLoading: currentState.isLoading,
    error: currentState.error,
    refresh,
    deleteOne,
    deleteAll,
  };
}
