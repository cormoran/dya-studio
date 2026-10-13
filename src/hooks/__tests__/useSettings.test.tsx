import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import { useCustomSubsystem } from "../useCustomSubsystem";
import { useSettings } from "../useSettings";
import { Notification, type Response } from "../../proto/zmk/settings/core";

jest.mock("@cormoran/zmk-studio-react-hook", () => ({
  ZMKAppContext: jest.requireActual("react").createContext(null),
}));
jest.mock("../useCustomSubsystem", () => ({
  useCustomSubsystem: jest.fn(),
}));

const mockSubsystem = jest.mocked(useCustomSubsystem);
const call = jest.fn<Promise<Response | null>, [unknown]>();
let connection: object | null;
let ready: boolean;
let index: number;
let listeners: {
  callback: (n: { payload: Uint8Array }) => void;
  unsubscribe: jest.Mock;
}[];
const onNotification = jest.fn(({ callback }) => {
  const unsubscribe = jest.fn();
  listeners.push({ callback, unsubscribe });
  return unsubscribe;
});
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ZMKAppContext.Provider
      value={{ state: { connection }, onNotification } as never}
    >
      {children}
    </ZMKAppContext.Provider>
  );
}
function notify(listener: number, idleMs = 300000) {
  listeners[listener].callback({
    payload: Notification.encode(
      Notification.create({
        activitySettings: { settings: { source: 0, idleMs, sleepMs: 900000 } },
      }),
    ).finish(),
  });
}
async function settle() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(500);
  });
}
function deferred() {
  let resolve!: (response: Response | null) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Response | null>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.useFakeTimers();
  connection = {};
  ready = true;
  index = 2;
  listeners = [];
  call.mockReset().mockResolvedValue(null);
  mockSubsystem.mockImplementation(
    () =>
      ({
        ready,
        subsystem: ready ? { index } : null,
        call,
        callRPC: jest.fn(),
      }) as never,
  );
});
afterEach(() => jest.useRealTimers());

it("clears devices when support disappears and ignores late notifications", async () => {
  const { result, rerender } = renderHook(useSettings, { wrapper: Wrapper });
  act(() => notify(0));
  expect(result.current.devices[0].idleMs).toBe(300000);
  ready = false;
  rerender();
  expect(result.current.devices).toEqual([]);
  expect(result.current.isLoading).toBe(false);
  expect(result.current.error).toBeNull();
  expect(listeners[0].unsubscribe).toHaveBeenCalledTimes(1);
  act(() => notify(0, 999));
  await settle();
  expect(result.current.devices).toEqual([]);
  expect(await result.current.setActivitySettings(600000, 900000)).toBe(false);
  expect(call).toHaveBeenCalledTimes(1);
});

it("loads fresh values on supported-to-supported connection and index changes", async () => {
  const { result, rerender } = renderHook(useSettings, { wrapper: Wrapper });
  act(() => notify(0));
  await settle();
  connection = {};
  rerender();
  expect(result.current.devices).toEqual([]);
  expect(listeners).toHaveLength(2);
  act(() => {
    notify(0, 999);
    notify(1, 600000);
  });
  await settle();
  expect(result.current.devices[0].idleMs).toBe(600000);
  index = 5;
  rerender();
  expect(result.current.devices).toEqual([]);
  act(() => notify(2, 60000));
  await settle();
  expect(result.current.devices[0].idleMs).toBe(60000);
});

it("restores support with a fresh read and clears settings on disconnect", async () => {
  const { result, rerender } = renderHook(useSettings, { wrapper: Wrapper });
  act(() => notify(0));
  ready = false;
  rerender();
  ready = true;
  connection = {};
  rerender();
  expect(result.current.devices).toEqual([]);
  act(() => notify(1, 60000));
  await settle();
  expect(result.current.devices[0].idleMs).toBe(60000);
  connection = null;
  ready = false;
  rerender();
  expect(result.current.devices).toEqual([]);
});

it.each(["resolve", "reject"] as const)(
  "ignores a late read %s without ending the new session load",
  async (outcome) => {
    const old = deferred();
    call.mockReturnValueOnce(old.promise);
    const { result, rerender } = renderHook(useSettings, { wrapper: Wrapper });
    connection = {};
    rerender();
    await act(async () => {
      if (outcome === "reject") old.reject(new Error("old failure"));
      else old.resolve({ error: { message: "old error" } } as Response);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(true);
    act(() => notify(1, 60000));
    await settle();
    expect(result.current.devices[0].idleMs).toBe(60000);
  },
);

it("does not reload or report success for a write completed after a session change", async () => {
  const { result, rerender } = renderHook(useSettings, { wrapper: Wrapper });
  await settle();
  const old = deferred();
  call.mockReturnValueOnce(old.promise);
  let write!: Promise<boolean>;
  act(() => {
    write = result.current.setActivitySettings(600000, 900000);
  });
  connection = {};
  rerender();
  await act(async () => {
    old.resolve({ setActivitySettings: { success: true } } as Response);
    expect(await write).toBe(false);
  });
  expect(call).toHaveBeenCalledTimes(3);
  expect(result.current.isLoading).toBe(true);
  expect(result.current.error).toBeNull();
});

it("rejects retained old-session actions and removes subscriptions on unmount", async () => {
  const { result, rerender, unmount } = renderHook(useSettings, {
    wrapper: Wrapper,
  });
  const oldWrite = result.current.setActivitySettings;
  const oldRead = result.current.loadAllSettings;
  connection = {};
  rerender();
  await act(async () => {
    expect(await oldWrite(0, 0)).toBe(false);
    expect(await oldRead()).toEqual([]);
  });
  expect(call).toHaveBeenCalledTimes(2);
  unmount();
  expect(listeners.every((l) => l.unsubscribe.mock.calls.length === 1)).toBe(
    true,
  );
});

it("preserves current-session values during Reload and does not reread for unrelated renders", async () => {
  const { result, rerender } = renderHook(useSettings, { wrapper: Wrapper });
  act(() => notify(0));
  await settle();
  const session = result.current.sessionKey;
  rerender();
  expect(result.current.sessionKey).toBe(session);
  expect(call).toHaveBeenCalledTimes(1);
  let read!: Promise<unknown>;
  act(() => {
    read = result.current.loadAllSettings();
  });
  expect(result.current.devices[0].idleMs).toBe(300000);
  act(() => notify(1, 60000));
  await settle();
  await read;
  expect(result.current.devices[0].idleMs).toBe(60000);
});
