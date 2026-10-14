import { act, renderHook, waitFor } from "@testing-library/react";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import type { ReactNode } from "react";
import { useWatchdog } from "../useWatchdog";
import {
  Request,
  Response,
  Incident,
  Notification,
} from "../../proto/cormoran/watchdog/watchdog";

const mockCall = jest.fn();
let mockReady = true;
let mockSubsystem: { index: number } | null = { index: 1 };
jest.mock("../useCustomSubsystem", () => ({
  useCustomSubsystem: () => ({
    call: mockCall,
    ready: mockReady,
    subsystem: mockSubsystem,
  }),
}));

const incident = Incident.create({ id: 7 });
const status = Response.create({
  status: { capacity: 16, stored: 1, droppedSinceBoot: 2 },
});
const page = Response.create({
  incidentPage: { total: 1, incidents: [incident] },
});
const empty = Response.create({ incidentPage: { total: 0 } });
const emptyStatus = Response.create({ status: { capacity: 8 } });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
let app: { state: { connection: object }; onNotification: jest.Mock };
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ZMKAppContext.Provider value={app as never}>
      {children}
    </ZMKAppContext.Provider>
  );
}
function central(req: Request) {
  if (req.getStatus) return Promise.resolve(status);
  if (req.deleteIncidents)
    return Promise.resolve(Response.create({ deleteResult: { deleted: 1 } }));
  return Promise.resolve(page);
}
beforeEach(() => {
  jest.clearAllMocks();
  mockReady = true;
  mockSubsystem = { index: 1 };
  app = { state: { connection: {} }, onNotification: jest.fn(() => jest.fn()) };
  mockCall.mockImplementation(central);
});
afterEach(() => jest.useRealTimers());

it("publishes status and incidents only after the entire read completes", async () => {
  const pending = deferred<Response>();
  mockCall.mockImplementation((req: Request) =>
    req.getStatus ? Promise.resolve(status) : pending.promise,
  );
  const { result } = renderHook(useWatchdog, { wrapper: Wrapper });
  await waitFor(() => expect(mockCall).toHaveBeenCalledTimes(2));
  expect(result.current.status).toBeNull();
  expect(result.current.isLoading).toBe(true);
  await act(async () => pending.resolve(page));
  expect(result.current.status?.capacity).toBe(16);
  expect(result.current.incidents).toEqual([incident]);
});

it.each([
  null,
  Response.create({}),
  Response.create({ error: { message: "unsupported source" } }),
])(
  "clears old statistics on unsuccessful reads and recovers on Central (%p)",
  async (failure) => {
    const { result } = renderHook(useWatchdog, { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).not.toBeNull());
    mockCall.mockImplementation((req: Request) =>
      req.getStatus?.source === 1 ? Promise.resolve(failure) : central(req),
    );
    act(() => result.current.setSource(1));
    expect(result.current.status).toBeNull();
    expect(result.current.incidents).toEqual([]);
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.status).toBeNull();
    act(() => result.current.setSource(0));
    await waitFor(() => expect(result.current.status?.capacity).toBe(16));
    expect(result.current.error).toBeNull();
  },
);

it("distinguishes a successful empty read", async () => {
  mockCall.mockImplementation((req: Request) =>
    Promise.resolve(req.getStatus ? emptyStatus : empty),
  );
  const { result } = renderHook(useWatchdog, { wrapper: Wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.status?.stored).toBe(0);
  expect(result.current.error).toBeNull();
  expect(result.current.incidents).toEqual([]);
});

it.each(["missing", "error", "empty", "offset", "limit"])(
  "rejects incomplete pagination: %s",
  async (mode) => {
    mockCall.mockImplementation((req: Request) => {
      if (req.getStatus) return Promise.resolve(status);
      const startIndex = req.listIncidents!.startIndex;
      if (mode === "limit")
        return Promise.resolve(
          Response.create({
            incidentPage: {
              startIndex,
              total: 65,
              incidents: [Incident.create({ id: startIndex })],
            },
          }),
        );
      if (!startIndex)
        return Promise.resolve(
          Response.create({
            incidentPage: { total: 2, incidents: [incident] },
          }),
        );
      if (mode === "missing") return Promise.resolve(null);
      if (mode === "error")
        return Promise.resolve(
          Response.create({ error: { message: "page failed" } }),
        );
      return Promise.resolve(
        Response.create({
          incidentPage: {
            startIndex: mode === "offset" ? 0 : 1,
            total: 2,
            incidents: mode === "empty" ? [] : [incident],
          },
        }),
      );
    });
    const { result } = renderHook(useWatchdog, { wrapper: Wrapper });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.status).toBeNull();
    expect(result.current.incidents).toEqual([]);
  },
);

it("ignores late success and failure from obsolete sources", async () => {
  const old = deferred<Response>();
  mockCall.mockImplementation((req: Request) =>
    req.getStatus?.source === 0
      ? old.promise
      : Promise.resolve(req.getStatus ? emptyStatus : empty),
  );
  const { result } = renderHook(useWatchdog, { wrapper: Wrapper });
  act(() => result.current.setSource(1));
  await waitFor(() => expect(result.current.status?.capacity).toBe(8));
  await act(async () => old.resolve(status));
  expect(result.current.status?.capacity).toBe(8);
  expect(result.current.error).toBeNull();
  const lateFailure = deferred<Response>();
  mockCall.mockImplementation((req: Request) =>
    req.getStatus?.source === 0
      ? lateFailure.promise
      : Promise.resolve(req.getStatus ? emptyStatus : empty),
  );
  act(() => result.current.setSource(0));
  act(() => result.current.setSource(1));
  await waitFor(() => expect(result.current.status?.capacity).toBe(8));
  await act(async () => lateFailure.reject(new Error("old failure")));
  expect(result.current.error).toBeNull();
  expect(result.current.isLoading).toBe(false);
});

it("only the newest overlapping refresh may publish or finish loading", async () => {
  const { result } = renderHook(useWatchdog, { wrapper: Wrapper });
  await waitFor(() => expect(result.current.status).not.toBeNull());
  const old = deferred<Response>();
  const latest = deferred<Response>();
  mockCall
    .mockReset()
    .mockReturnValueOnce(old.promise)
    .mockReturnValueOnce(latest.promise)
    .mockResolvedValue(empty);
  let first!: Promise<void>;
  let second!: Promise<void>;
  act(() => {
    first = result.current.refresh();
    second = result.current.refresh();
  });
  await act(async () => {
    old.resolve(status);
    await first;
  });
  expect(result.current.isLoading).toBe(true);
  expect(result.current.status).toBeNull();
  await act(async () => {
    latest.resolve(emptyStatus);
    await second;
  });
  expect(result.current.status?.capacity).toBe(8);
});

it.each(["connection", "ready", "index", "unavailable"])(
  "invalidates old session replies on %s changes",
  async (change) => {
    const old = deferred<Response>();
    mockCall.mockReturnValue(old.promise);
    const { result, rerender } = renderHook(useWatchdog, { wrapper: Wrapper });
    if (change === "connection") app = { ...app, state: { connection: {} } };
    if (change === "ready" || change === "unavailable") mockReady = false;
    if (change === "unavailable") mockSubsystem = null;
    if (change === "index") mockSubsystem = { index: 2 };
    mockCall.mockImplementation((req: Request) =>
      Promise.resolve(req.getStatus ? emptyStatus : empty),
    );
    rerender();
    if (mockReady)
      await waitFor(() => expect(result.current.status?.capacity).toBe(8));
    await act(async () => old.resolve(status));
    expect(result.current.status?.capacity).not.toBe(16);
    if (!mockReady) {
      expect(result.current.incidents).toEqual([]);
      mockReady = true;
      mockSubsystem = { index: 1 };
      rerender();
      await waitFor(() => expect(result.current.status?.capacity).toBe(8));
    }
  },
);

it("relay timeout is an error and switching source unsubscribes pending relays", async () => {
  jest.useFakeTimers();
  const { result } = renderHook(useWatchdog, { wrapper: Wrapper });
  await act(async () => {});
  mockCall.mockImplementation((req: Request) =>
    req.getStatus?.source === 1
      ? Promise.resolve(Response.create({ deferred: { requestId: 42 } }))
      : central(req),
  );
  act(() => result.current.setSource(1));
  await act(async () => {});
  const unsubscribe = app.onNotification.mock.results.at(-1)!.value;
  await act(async () => jest.advanceTimersByTime(3000));
  expect(result.current.error).toMatch(/timed out/);
  expect(result.current.status).toBeNull();
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  act(() => result.current.setSource(0));
  await act(async () => {});
  act(() => result.current.setSource(1));
  await act(async () => {});
  const subscription = app.onNotification.mock.calls.at(-1)![0];
  const cancel = app.onNotification.mock.results.at(-1)!.value;
  act(() => result.current.setSource(0));
  await act(async () => {});
  expect(cancel).toHaveBeenCalledTimes(1);
  await act(async () =>
    subscription.callback({
      payload: Notification.encode(
        Notification.create({
          peripheralResponse: { requestId: 42, response: emptyStatus },
        }),
      ).finish(),
    }),
  );
  expect(result.current.status?.capacity).toBe(16);
  expect(result.current.error).toBeNull();
});

it("preserves deletion source/IDs and reloads successful deletions", async () => {
  const { result } = renderHook(useWatchdog, { wrapper: Wrapper });
  await waitFor(() => expect(result.current.status).not.toBeNull());
  await act(async () => result.current.deleteOne(7));
  expect(mockCall).toHaveBeenCalledWith(
    Request.create({ deleteIncidents: { ids: [7], all: false, source: 0 } }),
  );
  act(() => result.current.setSource(1));
  await waitFor(() => expect(result.current.status).not.toBeNull());
  await act(async () => result.current.deleteAll());
  expect(mockCall).toHaveBeenCalledWith(
    Request.create({ deleteIncidents: { ids: [], all: true, source: 1 } }),
  );
  expect(result.current.incidents).toEqual([incident]);
});

it("does not erase deletion failures with a later successful read", async () => {
  const { result } = renderHook(useWatchdog, { wrapper: Wrapper });
  await waitFor(() => expect(result.current.status).not.toBeNull());
  mockCall.mockImplementation((req: Request) =>
    req.deleteIncidents
      ? Promise.resolve(
          Response.create({ error: { message: "delete failed" } }),
        )
      : central(req),
  );
  await act(async () => result.current.deleteAll());
  expect(result.current.error).toBe("delete failed");
  expect(result.current.status).toBeNull();
});

it("ignores a late page from an obsolete read", async () => {
  const oldPage = deferred<Response>();
  mockCall.mockImplementation((req: Request) => {
    if (req.getStatus)
      return Promise.resolve(req.getStatus.source === 0 ? status : emptyStatus);
    return req.listIncidents?.source === 0
      ? oldPage.promise
      : Promise.resolve(empty);
  });
  const { result } = renderHook(useWatchdog, { wrapper: Wrapper });
  await waitFor(() => expect(mockCall).toHaveBeenCalledTimes(2));
  act(() => result.current.setSource(1));
  await waitFor(() => expect(result.current.status?.capacity).toBe(8));
  await act(async () => oldPage.resolve(page));
  expect(result.current.incidents).toEqual([]);
  expect(result.current.status?.capacity).toBe(8);
});

it("unmount cancels relays and ignores detached notification callbacks", async () => {
  mockCall.mockResolvedValue(Response.create({ deferred: { requestId: 42 } }));
  const { unmount } = renderHook(useWatchdog, { wrapper: Wrapper });
  await act(async () => {});
  const callbacks = app.onNotification.mock.calls.map(
    ([subscription]) => subscription.callback,
  );
  const unsubscribes = app.onNotification.mock.results.map(
    ({ value }) => value,
  );
  unmount();
  for (const unsubscribe of unsubscribes)
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  await act(async () => {
    for (const callback of callbacks)
      callback({
        payload: Notification.encode(
          Notification.create({ incidentRecorded: { incident } }),
        ).finish(),
      });
  });
  expect(mockCall).toHaveBeenCalledTimes(1);
});

it("accepts relayed successful status and empty pages", async () => {
  mockCall.mockImplementation((req: Request) =>
    Promise.resolve(
      Response.create({ deferred: { requestId: req.getStatus ? 1 : 2 } }),
    ),
  );
  const { result } = renderHook(useWatchdog, { wrapper: Wrapper });
  await act(async () => {});
  const deliver = async (requestId: number, response: Response) => {
    const callback = app.onNotification.mock.calls.at(-1)![0].callback;
    await act(async () =>
      callback({
        payload: Notification.encode(
          Notification.create({ peripheralResponse: { requestId, response } }),
        ).finish(),
      }),
    );
  };
  await deliver(1, emptyStatus);
  expect(result.current.status).toBeNull();
  expect(result.current.isLoading).toBe(true);
  await deliver(2, empty);
  expect(result.current.status?.capacity).toBe(8);
  expect(result.current.error).toBeNull();
});
