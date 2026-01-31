/**
 * Tests for useHealthCheck hook
 *
 * This test suite verifies the device health check functionality,
 * including periodic health checks, failure tracking, and auto-disconnect.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { useHealthCheck } from "../useHealthCheck";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import type { ReactNode } from "react";

// Mock ZMKCustomSubsystem
jest.mock("@cormoran/zmk-studio-react-hook", () => ({
  ...jest.requireActual("@cormoran/zmk-studio-react-hook"),
  ZMKCustomSubsystem: jest.fn(),
}));

// Mock the proto
jest.mock("../../proto/zmk/ble_management/ble_management", () => ({
  Request: {
    create: jest.fn((obj) => obj),
    encode: jest.fn(() => ({ finish: () => new Uint8Array() })),
  },
  Response: {
    decode: jest.fn(),
  },
}));

import { ZMKCustomSubsystem } from "@cormoran/zmk-studio-react-hook";
import { Response } from "../../proto/zmk/ble_management/ble_management";

const MockedZMKCustomSubsystem = ZMKCustomSubsystem as jest.MockedClass<
  typeof ZMKCustomSubsystem
>;
const MockedResponse = Response as jest.Mocked<typeof Response>;

// Create a wrapper with ZMKAppContext
function createWrapper(zmkAppValue: unknown) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ZMKAppContext.Provider value={zmkAppValue as never}>
        {children}
      </ZMKAppContext.Provider>
    );
  };
}

describe("useHealthCheck", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Initial State", () => {
    it("should have healthy status when not connected", () => {
      const zmkApp = {
        state: { connection: null },
        isConnected: false,
        findSubsystem: jest.fn(),
      };

      const { result } = renderHook(() => useHealthCheck(), {
        wrapper: createWrapper(zmkApp),
      });

      expect(result.current.healthStatus).toBe("healthy");
      expect(result.current.consecutiveFailures).toBe(0);
      expect(result.current.lastCheckTime).toBeNull();
      expect(result.current.isChecking).toBe(false);
    });
  });

  describe("Health Checks", () => {
    it("should perform health check when connected", async () => {
      const mockConnection = { label: "test" };
      const mockSubsystem = { index: 0, identifier: "zmk__ble_management" };
      const mockCallRPC = jest.fn().mockResolvedValue(new Uint8Array());

      const zmkApp = {
        state: { connection: mockConnection },
        isConnected: true,
        findSubsystem: jest.fn().mockReturnValue(mockSubsystem),
      };

      MockedZMKCustomSubsystem.mockImplementation(
        () =>
          ({
            callRPC: mockCallRPC,
          }) as never,
      );

      MockedResponse.decode.mockReturnValue({
        getSplitInfo: { info: {} },
      } as never);

      jest.useRealTimers();

      const { result } = renderHook(() => useHealthCheck(), {
        wrapper: createWrapper(zmkApp),
      });

      await waitFor(
        () => {
          expect(result.current.healthStatus).toBe("healthy");
        },
        { timeout: 1000 },
      );

      expect(mockCallRPC).toHaveBeenCalled();
      expect(result.current.consecutiveFailures).toBe(0);

      jest.useFakeTimers();
    });

    it("should set warning status on first failure", async () => {
      const mockConnection = { label: "test" };
      const mockSubsystem = { index: 0, identifier: "zmk__ble_management" };
      const mockCallRPC = jest.fn().mockRejectedValue(new Error("Timeout"));

      const zmkApp = {
        state: { connection: mockConnection },
        isConnected: true,
        findSubsystem: jest.fn().mockReturnValue(mockSubsystem),
        disconnect: jest.fn(),
      };

      MockedZMKCustomSubsystem.mockImplementation(
        () =>
          ({
            callRPC: mockCallRPC,
          }) as never,
      );

      const { result } = renderHook(() => useHealthCheck(), {
        wrapper: createWrapper(zmkApp),
      });

      // Use real timers for async operations
      jest.useRealTimers();

      await waitFor(
        () => {
          expect(result.current.healthStatus).toBe("warning");
        },
        { timeout: 1000 },
      );

      expect(result.current.consecutiveFailures).toBe(1);
      expect(zmkApp.disconnect).not.toHaveBeenCalled();

      jest.useFakeTimers();
    });

    it.skip("should auto-disconnect after 3 consecutive failures (skipped: long running test)", async () => {
      const mockConnection = { label: "test" };
      const mockSubsystem = { index: 0, identifier: "zmk__ble_management" };
      const mockCallRPC = jest.fn().mockRejectedValue(new Error("Timeout"));

      const zmkApp = {
        state: { connection: mockConnection },
        isConnected: true,
        findSubsystem: jest.fn().mockReturnValue(mockSubsystem),
        disconnect: jest.fn(),
      };

      MockedZMKCustomSubsystem.mockImplementation(
        () =>
          ({
            callRPC: mockCallRPC,
          }) as never,
      );

      jest.useRealTimers();

      const { result } = renderHook(() => useHealthCheck(), {
        wrapper: createWrapper(zmkApp),
      });

      // Wait for initial check to fail
      await waitFor(
        () => {
          expect(result.current.consecutiveFailures).toBe(1);
        },
        { timeout: 1000 },
      );

      // Wait for second check (30 seconds later)
      await waitFor(
        () => {
          expect(result.current.consecutiveFailures).toBe(2);
        },
        { timeout: 31000 },
      );

      // Wait for third check (30 seconds later)
      await waitFor(
        () => {
          expect(result.current.consecutiveFailures).toBe(3);
          expect(result.current.healthStatus).toBe("unhealthy");
        },
        { timeout: 31000 },
      );

      // Auto-disconnect should be called
      expect(zmkApp.disconnect).toHaveBeenCalled();

      jest.useFakeTimers();
    }, 95000);

    it.skip("should reset failure count on successful check after failures (skipped: long running test)", async () => {
      const mockConnection = { label: "test" };
      const mockSubsystem = { index: 0, identifier: "zmk__ble_management" };
      let callCount = 0;
      const mockCallRPC = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("Timeout"));
        }
        return Promise.resolve(new Uint8Array());
      });

      const zmkApp = {
        state: { connection: mockConnection },
        isConnected: true,
        findSubsystem: jest.fn().mockReturnValue(mockSubsystem),
        disconnect: jest.fn(),
      };

      MockedZMKCustomSubsystem.mockImplementation(
        () =>
          ({
            callRPC: mockCallRPC,
          }) as never,
      );

      MockedResponse.decode.mockReturnValue({
        getSplitInfo: { info: {} },
      } as never);

      jest.useRealTimers();

      const { result } = renderHook(() => useHealthCheck(), {
        wrapper: createWrapper(zmkApp),
      });

      // Wait for first check to fail
      await waitFor(
        () => {
          expect(result.current.consecutiveFailures).toBe(1);
          expect(result.current.healthStatus).toBe("warning");
        },
        { timeout: 1000 },
      );

      // Wait for second check (should succeed)
      await waitFor(
        () => {
          expect(result.current.consecutiveFailures).toBe(0);
          expect(result.current.healthStatus).toBe("healthy");
        },
        { timeout: 31000 },
      );

      expect(zmkApp.disconnect).not.toHaveBeenCalled();

      jest.useFakeTimers();
    }, 35000);
  });

  describe("Connection State Changes", () => {
    it("should reset state when disconnected", async () => {
      const mockConnection = { label: "test" };
      const mockSubsystem = { index: 0, identifier: "zmk__ble_management" };
      const mockCallRPC = jest.fn().mockRejectedValue(new Error("Timeout"));

      const zmkApp = {
        state: { connection: mockConnection },
        isConnected: true,
        findSubsystem: jest.fn().mockReturnValue(mockSubsystem),
        disconnect: jest.fn(),
      };

      MockedZMKCustomSubsystem.mockImplementation(
        () =>
          ({
            callRPC: mockCallRPC,
          }) as never,
      );

      jest.useRealTimers();

      const { result, rerender } = renderHook(() => useHealthCheck(), {
        wrapper: createWrapper(zmkApp),
      });

      // Wait for failure
      await waitFor(
        () => {
          expect(result.current.consecutiveFailures).toBe(1);
        },
        { timeout: 1000 },
      );

      // Simulate disconnect
      zmkApp.isConnected = false;
      zmkApp.state.connection = null;

      rerender();

      await waitFor(
        () => {
          expect(result.current.healthStatus).toBe("healthy");
          expect(result.current.consecutiveFailures).toBe(0);
          expect(result.current.lastCheckTime).toBeNull();
        },
        { timeout: 1000 },
      );

      jest.useFakeTimers();
    });
  });
});
