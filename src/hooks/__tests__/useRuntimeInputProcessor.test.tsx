/**
 * Tests for useRuntimeInputProcessor hook
 *
 * This test suite verifies the runtime input processor state management,
 * including loading processors, setting scaling, and setting rotation.
 */
import { renderHook, act } from "@testing-library/react";
import { useRuntimeInputProcessor } from "../useRuntimeInputProcessor";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import type { ReactNode } from "react";
import {
  Response,
  Request,
  Notification,
} from "../../proto/zmk/runtime_input_processor/runtime_input_processor";

// Mock ZMKCustomSubsystem
const mockCallRPC = jest.fn();
const mockOnNotification = jest.fn();

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

// Create a wrapper with ZMKAppContext
function createWrapper(zmkAppValue: {
  state: {
    connection: unknown;
    customSubsystems: unknown[];
  };
  findSubsystem: (id: string) => { index: number; identifier: string } | null;
  onNotification: (subscription: unknown) => () => void;
}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ZMKAppContext.Provider value={zmkAppValue as never}>
        {children}
      </ZMKAppContext.Provider>
    );
  };
}

describe("useRuntimeInputProcessor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCallRPC.mockReset();
    mockOnNotification.mockReset();
    jest.useFakeTimers();
    mockOnNotification.mockReturnValue(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Initial State", () => {
    it("should have empty processors array initially", () => {
      const wrapper = createWrapper({
        state: { connection: null, customSubsystems: [] },
        findSubsystem: () => null,
        onNotification: mockOnNotification,
      });

      const { result } = renderHook(() => useRuntimeInputProcessor(), {
        wrapper,
      });

      expect(result.current.processors).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe("Not Connected", () => {
    it("should set error when not connected", async () => {
      const wrapper = createWrapper({
        state: { connection: null, customSubsystems: [] },
        findSubsystem: () => null,
        onNotification: mockOnNotification,
      });

      const { result } = renderHook(() => useRuntimeInputProcessor(), {
        wrapper,
      });

      await act(async () => {
        await result.current.loadProcessors();
      });

      expect(result.current.error).toBe(
        "Not connected to device or subsystem not found",
      );
    });

    it("should set error when subsystem not found", async () => {
      const wrapper = createWrapper({
        state: {
          connection: { isConnected: true } as never,
          customSubsystems: [],
        },
        findSubsystem: () => null,
        onNotification: mockOnNotification,
      });

      const { result } = renderHook(() => useRuntimeInputProcessor(), {
        wrapper,
      });

      await act(async () => {
        await result.current.loadProcessors();
      });

      expect(result.current.error).toBe(
        "Not connected to device or subsystem not found",
      );
    });
  });

  describe("Loading Processors", () => {
    it("should load processors successfully via notifications", async () => {
      const mockConnection = { isConnected: true };

      // Mock notification callback
      let notificationCallback:
        | ((notification: { payload: Uint8Array }) => void)
        | null = null;
      mockOnNotification.mockImplementation(
        (subscription: { callback: typeof notificationCallback }) => {
          notificationCallback = subscription.callback;
          return () => {}; // unsubscribe function
        },
      );

      // Mock successful RPC response (empty, data comes via notification)
      const response = Response.create({
        listProcessors: {},
      });
      mockCallRPC.mockResolvedValue(Response.encode(response).finish());

      const wrapper = createWrapper({
        state: {
          connection: mockConnection as never,
          customSubsystems: [{ index: 0, identifier: "cormoran_rip" }],
        },
        findSubsystem: (id: string) =>
          id === "cormoran_rip"
            ? { index: 0, identifier: "cormoran_rip" }
            : null,
        onNotification: mockOnNotification,
      });

      const { result } = renderHook(() => useRuntimeInputProcessor(), {
        wrapper,
      });

      // Wait for useEffect to trigger loadProcessors
      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });

      // Simulate notification arrival
      if (notificationCallback) {
        const notification = Notification.create({
          processorChanged: {
            processor: {
              id: 0,
              name: "trackpad",
              scaleMultiplier: 1,
              scaleDivisor: 1,
              rotationDegrees: 0,
              tempLayerEnabled: false,
              tempLayerLayer: 0,
              tempLayerActivationDelayMs: 100,
              tempLayerDeactivationDelayMs: 500,
              activeLayers: 0,
            },
          },
        });
        await act(async () => {
          notificationCallback({
            payload: Notification.encode(notification).finish(),
          });
          await jest.advanceTimersByTimeAsync(500); // Wait for notification collection timeout
        });
      }

      expect(result.current.processors).toHaveLength(1);
      expect(result.current.processors[0]).toEqual({
        id: 0,
        name: "trackpad",
        scaleMultiplier: 1,
        scaleDivisor: 1,
        rotationDegrees: 0,
        tempLayerEnabled: false,
        tempLayerLayer: 0,
        tempLayerActivationDelayMs: 100,
        tempLayerDeactivationDelayMs: 500,
        activeLayers: 0,
        axisSnapMode: 0,
        axisSnapThreshold: 0,
        axisSnapTimeoutMs: 0,
        xInvert: false,
        yInvert: false,
        xyToScrollEnabled: false,
        xySwapEnabled: false,
      });
      expect(result.current.error).toBe(null);

      // A later notification for the same ID replaces the existing row.
      act(() => {
        notificationCallback!({
          payload: Notification.encode(
            Notification.create({
              processorChanged: {
                processor: {
                  ...result.current.processors[0],
                  rotationDegrees: 45,
                },
              },
            }),
          ).finish(),
        });
      });
      expect(result.current.processors).toHaveLength(1);
      expect(result.current.processors[0].rotationDegrees).toBe(45);
    });
  });

  describe("Setting Scaling", () => {
    it("should set scaling successfully and simplify fraction", async () => {
      const mockConnection = { isConnected: true };

      let notificationCallback:
        | ((notification: { payload: Uint8Array }) => void)
        | null = null;
      mockOnNotification.mockImplementation(
        (subscription: { callback: typeof notificationCallback }) => {
          notificationCallback = subscription.callback;
          return () => {};
        },
      );

      mockCallRPC.mockImplementation(async (payload: Uint8Array) => {
        const request = Request.decode(payload);
        return Response.encode(
          Response.create({
            listProcessors: request.listProcessors ? {} : undefined,
            listLayers: request.listLayers ? {} : undefined,
            setScaleMultiplier: request.setScaleMultiplier ? {} : undefined,
            setScaleDivisor: request.setScaleDivisor ? {} : undefined,
          }),
        ).finish();
      });

      const wrapper = createWrapper({
        state: {
          connection: mockConnection as never,
          customSubsystems: [{ index: 0, identifier: "cormoran_rip" }],
        },
        findSubsystem: (id: string) =>
          id === "cormoran_rip"
            ? { index: 0, identifier: "cormoran_rip" }
            : null,
        onNotification: mockOnNotification,
      });

      const { result } = renderHook(() => useRuntimeInputProcessor(), {
        wrapper,
      });

      // Wait for initial load and send initial notification
      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
        if (notificationCallback) {
          const initialNotification = Notification.create({
            processorChanged: {
              processor: {
                id: 0,
                name: "trackpad",
                scaleMultiplier: 1,
                scaleDivisor: 1,
                rotationDegrees: 0,
                tempLayerEnabled: false,
                tempLayerLayer: 0,
                tempLayerActivationDelayMs: 100,
                tempLayerDeactivationDelayMs: 500,
                activeLayers: 0,
              },
            },
          });
          notificationCallback({
            payload: Notification.encode(initialNotification).finish(),
          });
        }
        await jest.advanceTimersByTimeAsync(500);
      });

      // Now call setScaling with a value that can be simplified (200/100 => 2/1)
      await act(async () => {
        await result.current.setScaling(0, 200, 100);
      });

      expect(result.current.error).toBe(null);
      const writes = mockCallRPC.mock.calls
        .map(([payload]) => Request.decode(payload))
        .filter(
          (request) => request.setScaleMultiplier || request.setScaleDivisor,
        );
      expect(writes).toEqual([
        Request.create({ setScaleMultiplier: { id: 0, value: 2 } }),
        Request.create({ setScaleDivisor: { id: 0, value: 1 } }),
      ]);
      expect(result.current.processors[0]?.scaleMultiplier).toBe(2);
      expect(result.current.processors[0]?.scaleDivisor).toBe(1);
    });
  });

  describe("Setting Rotation", () => {
    it("should set rotation successfully", async () => {
      const mockConnection = { isConnected: true };

      let notificationCallback:
        | ((notification: { payload: Uint8Array }) => void)
        | null = null;
      mockOnNotification.mockImplementation(
        (subscription: { callback: typeof notificationCallback }) => {
          notificationCallback = subscription.callback;
          return () => {};
        },
      );

      mockCallRPC.mockImplementation(async (payload: Uint8Array) => {
        const request = Request.decode(payload);
        return Response.encode(
          Response.create({
            listProcessors: request.listProcessors ? {} : undefined,
            listLayers: request.listLayers ? {} : undefined,
            setRotation: request.setRotation ? {} : undefined,
          }),
        ).finish();
      });

      const wrapper = createWrapper({
        state: {
          connection: mockConnection as never,
          customSubsystems: [{ index: 0, identifier: "cormoran_rip" }],
        },
        findSubsystem: (id: string) =>
          id === "cormoran_rip"
            ? { index: 0, identifier: "cormoran_rip" }
            : null,
        onNotification: mockOnNotification,
      });

      const { result } = renderHook(() => useRuntimeInputProcessor(), {
        wrapper,
      });

      // Wait for initial load and send initial notification
      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
        if (notificationCallback) {
          const initialNotification = Notification.create({
            processorChanged: {
              processor: {
                id: 0,
                name: "trackpad",
                scaleMultiplier: 1,
                scaleDivisor: 1,
                rotationDegrees: 0,
                tempLayerEnabled: false,
                tempLayerLayer: 0,
                tempLayerActivationDelayMs: 100,
                tempLayerDeactivationDelayMs: 500,
                activeLayers: 0,
              },
            },
          });
          notificationCallback({
            payload: Notification.encode(initialNotification).finish(),
          });
        }
        await jest.advanceTimersByTimeAsync(500);
      });

      // Now call setRotation
      await act(async () => {
        await result.current.setRotation(0, 90);
      });

      expect(result.current.error).toBe(null);
      const writes = mockCallRPC.mock.calls
        .map(([payload]) => Request.decode(payload))
        .filter((request) => request.setRotation);
      expect(writes).toEqual([
        Request.create({ setRotation: { id: 0, value: 90 } }),
      ]);
      expect(result.current.processors[0]?.rotationDegrees).toBe(90);
    });
  });

  describe("Error Handling", () => {
    it("should handle RPC errors", async () => {
      const mockConnection = { isConnected: true };

      mockCallRPC.mockRejectedValue(new Error("RPC failed"));

      const wrapper = createWrapper({
        state: {
          connection: mockConnection as never,
          customSubsystems: [{ index: 0, identifier: "cormoran_rip" }],
        },
        findSubsystem: (id: string) =>
          id === "cormoran_rip"
            ? { index: 0, identifier: "cormoran_rip" }
            : null,
        onNotification: mockOnNotification,
      });

      const { result } = renderHook(() => useRuntimeInputProcessor(), {
        wrapper,
      });

      await act(async () => {
        await result.current.loadProcessors();
      });

      expect(result.current.error).toContain("Failed to load processors");
    });

    it("should handle error response from device", async () => {
      const mockConnection = { isConnected: true };

      // Mock error response
      const errorResponse = Response.create({
        error: { message: "Test error" },
      });
      mockCallRPC.mockResolvedValue(Response.encode(errorResponse).finish());

      const wrapper = createWrapper({
        state: {
          connection: mockConnection as never,
          customSubsystems: [{ index: 0, identifier: "cormoran_rip" }],
        },
        findSubsystem: (id: string) =>
          id === "cormoran_rip"
            ? { index: 0, identifier: "cormoran_rip" }
            : null,
        onNotification: mockOnNotification,
      });

      const { result } = renderHook(() => useRuntimeInputProcessor(), {
        wrapper,
      });

      await act(async () => {
        const loading = result.current.loadProcessors();
        await jest.advanceTimersByTimeAsync(500);
        await loading;
      });

      expect(result.current.error).toBe("Test error");
    });
  });
});
