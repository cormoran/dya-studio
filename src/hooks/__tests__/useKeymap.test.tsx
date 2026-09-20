/**
 * Tests for useKeymap hook
 *
 * This test suite verifies the keymap state management,
 * including loading, modifying, and saving keymaps.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { useKeymap } from "../useKeymap";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import { STUDIO_LOCKED_MESSAGE } from "../../lib/studioUnlock";
import type { ReactNode } from "react";

// Mock the zmk-studio-ts-client
jest.mock("@zmkfirmware/zmk-studio-ts-client", () => ({
  call_rpc: jest.fn(),
  MetaError: class MetaError extends Error {
    condition: number;
    constructor(condition: number) {
      super("MetaError");
      this.condition = condition;
    }
  },
}));

jest.mock("@zmkfirmware/zmk-studio-ts-client/meta", () => ({
  ErrorConditions: {
    GENERIC: 0,
    UNLOCK_REQUIRED: 1,
    RPC_NOT_FOUND: 2,
    MSG_DECODE_FAILED: 3,
    MSG_ENCODE_FAILED: 4,
    UNRECOGNIZED: -1,
  },
}));

import { call_rpc, MetaError } from "@zmkfirmware/zmk-studio-ts-client";

const mockCallRpc = call_rpc as jest.MockedFunction<typeof call_rpc>;

// Test data
const mockPhysicalLayouts = {
  activeLayoutIndex: 0,
  layouts: [
    {
      name: "Default",
      keys: [
        { width: 100, height: 100, x: 0, y: 0, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 100, y: 0, r: 0, rx: 0, ry: 0 },
      ],
    },
  ],
};

const mockKeymap = {
  layers: [
    {
      id: 0,
      name: "Base",
      bindings: [
        { behaviorId: 1, param1: 0x04, param2: 0 }, // A key
        { behaviorId: 1, param1: 0x05, param2: 0 }, // B key
      ],
    },
    {
      id: 1,
      name: "Lower",
      bindings: [
        { behaviorId: 2, param1: 0, param2: 0 }, // Trans
        { behaviorId: 2, param1: 0, param2: 0 }, // Trans
      ],
    },
  ],
  availableLayers: 4,
  maxLayerNameLength: 32,
};

const mockBehaviors = [1, 2, 3]; // kp, trans, mo

const mockBehaviorDetails: Record<
  number,
  { id: number; displayName: string; metadata: never[] }
> = {
  1: { id: 1, displayName: "kp", metadata: [] },
  2: { id: 2, displayName: "trans", metadata: [] },
  3: { id: 3, displayName: "mo", metadata: [] },
};

const loadRpc: typeof call_rpc = async (_conn, req) => {
  if (req.keymap?.getPhysicalLayouts) {
    return {
      keymap: { getPhysicalLayouts: mockPhysicalLayouts },
    } as never;
  }
  if (req.keymap?.getKeymap) {
    return { keymap: { getKeymap: mockKeymap } } as never;
  }
  if (req.behaviors?.listAllBehaviors) {
    return {
      behaviors: { listAllBehaviors: { behaviors: mockBehaviors } },
    } as never;
  }
  if (req.behaviors?.getBehaviorDetails) {
    const id = req.behaviors.getBehaviorDetails.behaviorId;
    return {
      behaviors: { getBehaviorDetails: mockBehaviorDetails[id] },
    } as never;
  }
  if (req.keymap?.checkUnsavedChanges) {
    return { keymap: { checkUnsavedChanges: false } } as never;
  }
  return {} as never;
};

// Create a wrapper with ZMKAppContext
function createWrapper(zmkAppValue: unknown) {
  // useKeymap now loads via useKeymapSource, which consults the device's
  // custom subsystems. Default to "no fast-keymap subsystem present" so
  // loading uses the official protocol these tests mock (a test can override
  // findSubsystem to exercise the fast path).
  const value = {
    findSubsystem: () => null,
    ...(zmkAppValue as Record<string, unknown>),
  } as never;
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ZMKAppContext.Provider value={value}>{children}</ZMKAppContext.Provider>
    );
  };
}

describe("useKeymap", () => {
  beforeEach(() => {
    mockCallRpc.mockReset();
  });

  describe("Initial State", () => {
    it("should have null values when not connected", () => {
      const zmkApp = {
        state: { connection: null },
        onNotification: jest.fn(() => jest.fn()),
      };

      const { result } = renderHook(() => useKeymap(), {
        wrapper: createWrapper(zmkApp),
      });

      expect(result.current.physicalLayouts).toBeNull();
      expect(result.current.keymap).toBeNull();
      expect(result.current.behaviors.size).toBe(0);
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFullyLoaded).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("Data Loading", () => {
    it("should load keymap data when connected", async () => {
      const mockConnection = { label: "test" };
      const zmkApp = {
        state: { connection: mockConnection },
        onNotification: jest.fn(() => jest.fn()),
      };

      // Setup mock responses
      mockCallRpc.mockImplementation(loadRpc);

      const { result } = renderHook(() => useKeymap(), {
        wrapper: createWrapper(zmkApp),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.physicalLayouts).toEqual(mockPhysicalLayouts);
      expect(result.current.keymap).toEqual(mockKeymap);
      expect(result.current.behaviors.size).toBe(3);
      // Official path defers nothing to the background, so the load is fully
      // complete as soon as it finishes.
      expect(result.current.isFullyLoaded).toBe(true);
    });

    it("surfaces the shared 'device is locked' message when a load hits an unlock error", async () => {
      // In the app this load is wrapped by StudioUnlockProvider's runWithUnlock,
      // which parks it and shows the unlock modal (see
      // StudioUnlockContext.test.tsx). Rendered here without that provider the
      // gate is a passthrough, so the unlock error surfaces as the shared
      // STUDIO_LOCKED_MESSAGE (mapped by studioLockErrorText).
      const mockConnection = { label: "test" };
      const zmkApp = {
        state: { connection: mockConnection },
        onNotification: jest.fn(() => jest.fn()),
      };

      // Return unlock required error
      mockCallRpc.mockResolvedValue({
        meta: { simpleError: 1 }, // UNLOCK_REQUIRED
      } as never);

      const { result } = renderHook(() => useKeymap(), {
        wrapper: createWrapper(zmkApp),
      });

      await waitFor(() => {
        expect(result.current.error).toBe(STUDIO_LOCKED_MESSAGE);
      });
    });

    it("shows the keymap without unlock when only checkUnsavedChanges is locked", async () => {
      // Mirrors the fast-keymap case: the data loads fine (unsecured), but the
      // secured checkUnsavedChanges fails with unlock-required. The keymap must
      // still be viewable — no unlock prompt.
      const mockConnection = { label: "test" };
      const zmkApp = {
        state: { connection: mockConnection },
        onNotification: jest.fn(() => jest.fn()),
      };

      mockCallRpc.mockImplementation(async (connection, req) => {
        if (req.keymap?.checkUnsavedChanges) {
          throw new MetaError(1); // UNLOCK_REQUIRED
        }
        return loadRpc(connection, req);
      });

      const { result } = renderHook(() => useKeymap(), {
        wrapper: createWrapper(zmkApp),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.keymap).toEqual(mockKeymap);
      expect(result.current.hasUnsavedChanges).toBe(false);
    });
  });

  describe("Layer restoration", () => {
    // Regression: after reconnecting, a layer that was removed and saved in an
    // earlier session must still be restorable. removedLayerIds is derived from
    // device state (the fixed layer pool `activeLayers + availableLayers` minus
    // the active ids) rather than from in-session tracking, which is cleared on
    // disconnect. Here the device reports 2 active layers (ids 0,1) with
    // availableLayers=4 — i.e. a 6-slot pool with ids 2..5 removed — so those
    // four ids must surface as restorable straight after a fresh load.
    it("derives restorable layer ids from device state on load", async () => {
      const mockConnection = { label: "test" };
      const zmkApp = {
        state: { connection: mockConnection },
        onNotification: jest.fn(() => jest.fn()),
      };

      mockCallRpc.mockImplementation(loadRpc);

      const { result } = renderHook(() => useKeymap(), {
        wrapper: createWrapper(zmkApp),
      });

      await waitFor(() => {
        expect(result.current.keymap).not.toBeNull();
      });

      // mockKeymap: active ids [0,1], availableLayers 4 -> pool of 6, ids 2..5
      // are removed and restorable.
      expect(result.current.removedLayerIds).toEqual([2, 3, 4, 5]);
    });
  });

  describe("Binding Operations", () => {
    it("should check if binding is modified correctly", async () => {
      const mockConnection = { label: "test" };
      const zmkApp = {
        state: { connection: mockConnection },
        onNotification: jest.fn(() => jest.fn()),
      };

      // Setup mock responses for successful loading
      mockCallRpc.mockImplementation(loadRpc);

      const { result } = renderHook(() => useKeymap(), {
        wrapper: createWrapper(zmkApp),
      });

      await waitFor(() => {
        expect(result.current.keymap).not.toBeNull();
      });

      // Initially, no bindings should be modified
      expect(result.current.isBindingModified(0, 0)).toBe(false);
      expect(result.current.isBindingModified(0, 1)).toBe(false);
    });

    it("should get original binding correctly", async () => {
      const mockConnection = { label: "test" };
      const zmkApp = {
        state: { connection: mockConnection },
        onNotification: jest.fn(() => jest.fn()),
      };

      mockCallRpc.mockImplementation(loadRpc);

      const { result } = renderHook(() => useKeymap(), {
        wrapper: createWrapper(zmkApp),
      });

      await waitFor(() => {
        expect(result.current.keymap).not.toBeNull();
      });

      const original = result.current.getOriginalBinding(0, 0);
      expect(original).toEqual({ behaviorId: 1, param1: 0x04, param2: 0 });
    });
  });

  describe("Behavior Lookup", () => {
    it("should get behavior by ID", async () => {
      const mockConnection = { label: "test" };
      const zmkApp = {
        state: { connection: mockConnection },
        onNotification: jest.fn(() => jest.fn()),
      };

      mockCallRpc.mockImplementation(loadRpc);

      const { result } = renderHook(() => useKeymap(), {
        wrapper: createWrapper(zmkApp),
      });

      await waitFor(() => {
        expect(result.current.behaviors.size).toBe(3);
      });

      const behavior = result.current.getBehavior(1);
      expect(behavior).toBeDefined();
      expect(behavior?.displayName).toBe("kp");
    });
  });

  // Unlock state is no longer owned by useKeymap: the shared StudioUnlockProvider
  // opens the modal and retries the failed request after unlock (see
  // StudioUnlockContext.test.tsx). useKeymap no longer exposes
  // unlockRequired/clearUnlockRequired.
});
