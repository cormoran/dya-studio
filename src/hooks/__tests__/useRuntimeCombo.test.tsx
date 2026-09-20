import { act, renderHook, waitFor } from "@testing-library/react";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import type { ReactNode } from "react";
import { useRuntimeCombo } from "../useRuntimeCombo";
import {
  STUDIO_LOCKED_MESSAGE,
  StudioUnlockCancelledError,
} from "../../lib/studioUnlock";
import {
  ComboSource,
  Response,
  SlowReleaseOverride,
  Request,
  type Combo,
} from "../../proto/cormoran/runtime_combo/runtime_combo";

const mockCallRPC = jest.fn();

jest.mock("@cormoran/zmk-studio-react-hook", () => {
  const actual = jest.requireActual("@cormoran/zmk-studio-react-hook");
  const {
    createUseCustomSubsystemMock,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
  } = require("../testUtils/mockUseCustomSubsystem");
  const ZMKCustomSubsystem = jest.fn().mockImplementation(() => ({
    callRPC: mockCallRPC,
  }));
  return {
    ...actual,
    ZMKCustomSubsystem,
    useCustomSubsystem: createUseCustomSubsystemMock(
      actual.ZMKAppContext,
      ZMKCustomSubsystem,
    ),
  };
});

function createWrapper(zmkAppValue: {
  state: {
    connection: unknown;
    customSubsystems: unknown[];
  };
  findSubsystem: (id: string) => { index: number; identifier: string } | null;
}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ZMKAppContext.Provider value={zmkAppValue as never}>
        {children}
      </ZMKAppContext.Provider>
    );
  };
}

describe("useRuntimeCombo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads combos and global settings from the runtime combo subsystem", async () => {
    const combo: Combo = {
      index: 0,
      name: "Escape chord",
      keyPositions: [0, 1],
      behavior: { behaviorId: 10, param1: 0x29, param2: 0 },
      layerMask: 0,
      enabled: true,
      timeoutMs: 0,
      requirePriorIdleMs: 0,
      slowReleaseOverride: SlowReleaseOverride.SLOW_RELEASE_OVERRIDE_INHERIT,
      source: ComboSource.COMBO_SOURCE_EMPTY,
    };

    mockCallRPC
      .mockResolvedValueOnce(
        Response.encode(
          Response.create({ listCombos: { combos: [combo] } }),
        ).finish(),
      )
      .mockResolvedValueOnce(
        Response.encode(
          Response.create({
            getGlobalSettings: {
              settings: { timeoutMs: 50, slowRelease: false, maxCombo: 16 },
            },
          }),
        ).finish(),
      );

    const wrapper = createWrapper({
      state: {
        connection: { isConnected: true },
        customSubsystems: [{ index: 7, identifier: "cormoran__runtime_combo" }],
      },
      findSubsystem: (id: string) =>
        id === "cormoran__runtime_combo"
          ? { index: 7, identifier: "cormoran__runtime_combo" }
          : null,
    });

    const { result } = renderHook(() => useRuntimeCombo(), { wrapper });

    await waitFor(() => expect(result.current.combos).toHaveLength(1));
    expect(result.current.isAvailable).toBe(true);
    expect(result.current.combos[0]).toEqual(combo);
    expect(result.current.globalSettings).toEqual({
      timeoutMs: 50,
      slowRelease: false,
      maxCombo: 16,
      requirePriorIdleMs: 0,
    });
    expect(result.current.error).toBe(null);
  });

  it("shows the shared 'device is locked' message when the gate blocks a request", async () => {
    // The gate rejects with StudioUnlockCancelledError when the user dismisses
    // the unlock modal (or during the cooldown); the hook must map it to the
    // clear shared message instead of a "Failed to load runtime combos: ..." one.
    mockCallRPC.mockRejectedValue(new StudioUnlockCancelledError());

    const wrapper = createWrapper({
      state: {
        connection: { isConnected: true },
        customSubsystems: [{ index: 7, identifier: "cormoran__runtime_combo" }],
      },
      findSubsystem: (id: string) =>
        id === "cormoran__runtime_combo"
          ? { index: 7, identifier: "cormoran__runtime_combo" }
          : null,
    });

    const { result } = renderHook(() => useRuntimeCombo(), { wrapper });

    await waitFor(() =>
      expect(result.current.error).toBe(STUDIO_LOCKED_MESSAGE),
    );
  });

  it("does not fire duplicate requests while a load is parked (locked)", async () => {
    // When locked, the RPCs never settle (the gate parks them). A re-triggered
    // reload must NOT start another round of requests — that was the Macro&Combo
    // "infinite requests while the unlock modal is up" bug.
    mockCallRPC.mockReturnValue(new Promise<never>(() => {})); // never resolves

    const wrapper = createWrapper({
      state: {
        connection: { isConnected: true },
        customSubsystems: [{ index: 7, identifier: "cormoran__runtime_combo" }],
      },
      findSubsystem: (id: string) =>
        id === "cormoran__runtime_combo"
          ? { index: 7, identifier: "cormoran__runtime_combo" }
          : null,
    });

    const { result } = renderHook(() => useRuntimeCombo(), { wrapper });

    // Mount auto-load fires listCombos + getGlobalSettings (2 calls), then parks.
    await waitFor(() => expect(mockCallRPC).toHaveBeenCalledTimes(2));

    // Re-triggering reload while the first is still parked adds no new requests.
    await act(async () => {
      await result.current.reload();
    });
    await act(async () => {
      await result.current.reload();
    });
    expect(mockCallRPC).toHaveBeenCalledTimes(2);
  });

  it("does not re-load on re-render when a load fails fast (locked, gate rejects)", async () => {
    // If the unlock error is not recognized the gate *rejects* (fails fast)
    // rather than parking. The auto-load must still fire only once per
    // ready-transition -- re-renders must not re-trigger it, or the device is
    // hammered with repeated load attempts while the unlock modal is open.
    mockCallRPC.mockRejectedValue(new StudioUnlockCancelledError());

    const wrapper = createWrapper({
      state: {
        connection: { isConnected: true },
        customSubsystems: [{ index: 7, identifier: "cormoran__runtime_combo" }],
      },
      findSubsystem: (id: string) =>
        id === "cormoran__runtime_combo"
          ? { index: 7, identifier: "cormoran__runtime_combo" }
          : null,
    });

    const { result, rerender } = renderHook(() => useRuntimeCombo(), {
      wrapper,
    });

    // Mount auto-load fires listCombos + getGlobalSettings (2 calls), fails fast.
    await waitFor(() => expect(mockCallRPC).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(result.current.error).toBe(STUDIO_LOCKED_MESSAGE),
    );

    // Re-rendering (e.g. gate/connection identity churn) must not re-load.
    rerender();
    rerender();
    rerender();
    expect(mockCallRPC).toHaveBeenCalledTimes(2);
  });

  it("reports unavailable when the subsystem is missing", () => {
    const wrapper = createWrapper({
      state: { connection: { isConnected: true }, customSubsystems: [] },
      findSubsystem: () => null,
    });

    const { result } = renderHook(() => useRuntimeCombo(), { wrapper });

    expect(result.current.isAvailable).toBe(false);
    expect(result.current.combos).toEqual([]);
  });

  it("resets a combo to its default and reloads combos from the device", async () => {
    const resetCombo: Combo = {
      index: 0,
      name: "Escape chord",
      keyPositions: [0, 1],
      behavior: { behaviorId: 10, param1: 0x29, param2: 0 },
      layerMask: 0,
      enabled: true,
      timeoutMs: 0,
      requirePriorIdleMs: 0,
      slowReleaseOverride: SlowReleaseOverride.SLOW_RELEASE_OVERRIDE_INHERIT,
      source: ComboSource.COMBO_SOURCE_DEFAULT,
    };

    mockCallRPC
      .mockResolvedValueOnce(
        Response.encode(
          Response.create({ listCombos: { combos: [] } }),
        ).finish(),
      )
      .mockResolvedValueOnce(
        Response.encode(
          Response.create({
            getGlobalSettings: {
              settings: {
                timeoutMs: 50,
                slowRelease: false,
                maxCombo: 16,
                requirePriorIdleMs: 0,
              },
            },
          }),
        ).finish(),
      )
      .mockResolvedValueOnce(
        Response.encode(
          Response.create({ status: { affectedCount: 1, message: "ok" } }),
        ).finish(),
      )
      .mockResolvedValueOnce(
        Response.encode(
          Response.create({ listCombos: { combos: [resetCombo] } }),
        ).finish(),
      );

    const wrapper = createWrapper({
      state: {
        connection: { isConnected: true },
        customSubsystems: [{ index: 7, identifier: "cormoran__runtime_combo" }],
      },
      findSubsystem: (id: string) =>
        id === "cormoran__runtime_combo"
          ? { index: 7, identifier: "cormoran__runtime_combo" }
          : null,
    });

    const { result } = renderHook(() => useRuntimeCombo(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.resetCombo(0);
    });

    expect(ok).toBe(true);
    expect(result.current.combos).toEqual([resetCombo]);
    expect(result.current.hasPendingChanges).toBe(true);
  });

  it("marks a deleted combo as pending and reloads its disabled override", async () => {
    const deletedCombo: Combo = {
      index: 0,
      name: "Escape chord",
      keyPositions: [0, 1],
      behavior: { behaviorId: 10, param1: 0x29, param2: 0 },
      layerMask: 0,
      enabled: false,
      timeoutMs: 0,
      requirePriorIdleMs: 0,
      slowReleaseOverride: SlowReleaseOverride.SLOW_RELEASE_OVERRIDE_INHERIT,
      source: ComboSource.COMBO_SOURCE_OVERRIDDEN,
    };

    mockCallRPC
      .mockResolvedValueOnce(
        Response.encode(
          Response.create({ listCombos: { combos: [] } }),
        ).finish(),
      )
      .mockResolvedValueOnce(
        Response.encode(
          Response.create({
            getGlobalSettings: {
              settings: { timeoutMs: 50, slowRelease: false, maxCombo: 16 },
            },
          }),
        ).finish(),
      )
      .mockResolvedValueOnce(
        Response.encode(
          Response.create({ status: { affectedCount: 1, message: "ok" } }),
        ).finish(),
      )
      .mockResolvedValueOnce(
        Response.encode(
          Response.create({ listCombos: { combos: [deletedCombo] } }),
        ).finish(),
      );

    const wrapper = createWrapper({
      state: {
        connection: { isConnected: true },
        customSubsystems: [{ index: 7, identifier: "cormoran__runtime_combo" }],
      },
      findSubsystem: (id: string) =>
        id === "cormoran__runtime_combo"
          ? { index: 7, identifier: "cormoran__runtime_combo" }
          : null,
    });

    const { result } = renderHook(() => useRuntimeCombo(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.deleteCombo(0);
    });

    expect(ok).toBe(true);
    expect(result.current.hasPendingChanges).toBe(true);
    expect(result.current.combos).toEqual([deletedCombo]);
    expect(Request.decode(mockCallRPC.mock.calls[2][0]).deleteCombo).toEqual({
      index: 0,
      persist: false,
    });
  });

  it("sets the global require-prior-idle duration", async () => {
    mockCallRPC
      .mockResolvedValueOnce(
        Response.encode(
          Response.create({ listCombos: { combos: [] } }),
        ).finish(),
      )
      .mockResolvedValueOnce(
        Response.encode(
          Response.create({
            getGlobalSettings: {
              settings: {
                timeoutMs: 50,
                slowRelease: false,
                maxCombo: 16,
                requirePriorIdleMs: 0,
              },
            },
          }),
        ).finish(),
      )
      .mockResolvedValueOnce(
        Response.encode(
          Response.create({ status: { affectedCount: 1, message: "ok" } }),
        ).finish(),
      );

    const wrapper = createWrapper({
      state: {
        connection: { isConnected: true },
        customSubsystems: [{ index: 7, identifier: "cormoran__runtime_combo" }],
      },
      findSubsystem: (id: string) =>
        id === "cormoran__runtime_combo"
          ? { index: 7, identifier: "cormoran__runtime_combo" }
          : null,
    });

    const { result } = renderHook(() => useRuntimeCombo(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.setRequirePriorIdleMs(30);
    });

    expect(ok).toBe(true);
    expect(result.current.globalSettings).toEqual({
      timeoutMs: 50,
      slowRelease: false,
      maxCombo: 16,
      requirePriorIdleMs: 30,
    });
    expect(result.current.hasPendingChanges).toBe(true);
  });
});
