import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  ZMKAppContext,
  ZMKCustomSubsystem,
} from "@cormoran/zmk-studio-react-hook";
import type { CustomNotification } from "@zmkfirmware/zmk-studio-ts-client/custom";
import { usePmw3610 } from "../usePmw3610";
import {
  Notification,
  PixelFormat,
  Request,
  Response,
} from "../../proto/cormoran/pmw3610/pmw3610";

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

type NotificationCallback = (n: CustomNotification) => void;

function createWrapper() {
  const subscribedCallbacks = new Set<NotificationCallback>();
  const zmkAppValue = {
    state: { connection: {}, customSubsystems: [] },
    findSubsystem: () => ({ index: 12, identifier: "cormoran__pmw3610" }),
    onNotification: (subscription: {
      type: string;
      subsystemIndex?: number;
      callback: NotificationCallback;
    }) => {
      if (subscription.type === "custom") {
        subscribedCallbacks.add(subscription.callback);
      }
      return () => {
        subscribedCallbacks.delete(subscription.callback);
      };
    },
  };
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ZMKAppContext.Provider value={zmkAppValue as never}>
      {children}
    </ZMKAppContext.Provider>
  );
  return {
    Wrapper,
    emit: (notification: CustomNotification) => {
      for (const callback of subscribedCallbacks) callback(notification);
    },
  };
}

function encodeResponse(response: Parameters<typeof Response.create>[0]) {
  return Response.encode(Response.create(response)).finish();
}

describe("usePmw3610 frame capture/streaming", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCallRPC.mockImplementation(async (payload: Uint8Array) => {
      const req = Request.decode(payload);
      if (req.getInfo !== undefined) {
        return encodeResponse({ getInfo: { devices: [] } });
      }
      return encodeResponse({ error: { message: "unhandled" } });
    });
  });

  it("captureOnce assembles a frame from paged GetFrameChunk responses", async () => {
    mockCallRPC.mockImplementation(async (payload: Uint8Array) => {
      const req = Request.decode(payload);
      if (req.getInfo !== undefined) {
        return encodeResponse({ getInfo: { devices: [] } });
      }
      if (req.captureFrame !== undefined) {
        return encodeResponse({
          captureFrame: {
            frameId: 1,
            pixelCount: 4,
            chunkSize: 2,
            complete: true,
            durationMs: 5,
          },
        });
      }
      if (req.getFrameChunk !== undefined) {
        const { offset } = req.getFrameChunk;
        const data =
          offset === 0
            ? Uint8Array.from([0x81, 0x82])
            : Uint8Array.from([0x83, 0x84]);
        return encodeResponse({
          getFrameChunk: { frameId: 1, offset, data },
        });
      }
      return encodeResponse({ error: { message: "unhandled" } });
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePmw3610(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isAvailable).toBe(true));

    await act(async () => {
      await result.current.captureOnce(0, 2);
    });

    expect(result.current.frame).not.toBeNull();
    expect(Array.from(result.current.frame!.bytes)).toEqual([
      0x81, 0x82, 0x83, 0x84,
    ]);
    expect(result.current.frame!.pixelCount).toBe(4);
    expect(result.current.frame!.complete).toBe(true);
    expect(result.current.isCapturing).toBe(false);
    expect(result.current.frame!.format).toBe(PixelFormat.PIXEL_FORMAT_PG7);
  });

  it("discovers a split peripheral and routes diagnostics to its source", async () => {
    const { Wrapper, emit } = createWrapper();
    mockCallRPC.mockImplementation(async (payload: Uint8Array) => {
      const req = Request.decode(payload);
      if (req.getInfo !== undefined) {
        expect(req.getInfo.source).toBe(0xffffffff);
        setTimeout(() => {
          emit({
            subsystemIndex: 12,
            payload: Notification.encode(
              Notification.create({
                peripheralResponse: {
                  source: 1,
                  requestId: 31,
                  response: Response.create({
                    getInfo: {
                      devices: [
                        {
                          ready: true,
                          productId: 0x3e,
                          deviceIndex: 0,
                          settingsId: "mkb-rtb",
                        },
                      ],
                    },
                  }),
                },
              }),
            ).finish(),
          });
        }, 0);
        return encodeResponse({
          getInfo: { devices: [], relayRequestId: 31 },
        });
      }
      if (req.readDiagnostics !== undefined) {
        expect(req.readDiagnostics).toMatchObject({
          deviceIndex: 0,
          source: 1,
        });
        setTimeout(() => {
          emit({
            subsystemIndex: 12,
            payload: Notification.encode(
              Notification.create({
                peripheralResponse: {
                  source: 1,
                  requestId: 32,
                  response: Response.create({
                    readDiagnostics: { squal: 47, shutter: 9 },
                  }),
                },
              }),
            ).finish(),
          });
        }, 0);
        return encodeResponse({ deferred: { requestId: 32 } });
      }
      return encodeResponse({ error: { message: "unhandled" } });
    });

    const { result } = renderHook(() => usePmw3610(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.devices).toHaveLength(1), {
      timeout: 3_500,
    });
    expect(result.current.devices[0]).toMatchObject({
      source: 1,
      deviceIndex: 0,
      settingsId: "mkb-rtb",
    });

    await act(async () => {
      await result.current.readDiagnostics(0);
    });
    expect(result.current.diagnostics).toMatchObject({
      squal: 47,
      shutter: 9,
    });
  }, 10_000);

  it("captureOnce honors an explicit RAW8 format (no bit7 masking, no invalid bytes)", async () => {
    mockCallRPC.mockImplementation(async (payload: Uint8Array) => {
      const req = Request.decode(payload);
      if (req.getInfo !== undefined) {
        return encodeResponse({ getInfo: { devices: [] } });
      }
      if (req.captureFrame !== undefined) {
        return encodeResponse({
          captureFrame: {
            frameId: 1,
            pixelCount: 4,
            chunkSize: 2,
            complete: true,
            durationMs: 5,
            format: PixelFormat.PIXEL_FORMAT_RAW8,
          },
        });
      }
      if (req.getFrameChunk !== undefined) {
        const { offset } = req.getFrameChunk;
        const data =
          offset === 0
            ? Uint8Array.from([0x00, 0x40])
            : Uint8Array.from([0x7f, 0xff]);
        return encodeResponse({
          getFrameChunk: { frameId: 1, offset, data },
        });
      }
      return encodeResponse({ error: { message: "unhandled" } });
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePmw3610(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isAvailable).toBe(true));

    await act(async () => {
      await result.current.captureOnce(0, 2);
    });

    expect(result.current.frame).not.toBeNull();
    expect(Array.from(result.current.frame!.bytes)).toEqual([
      0x00, 0x40, 0x7f, 0xff,
    ]);
    // RAW8 has no per-pixel validity bit -- every byte counts as valid.
    expect(result.current.frame!.invalidCount).toBe(0);
    expect(result.current.frame!.format).toBe(PixelFormat.PIXEL_FORMAT_RAW8);
  });

  it("startStreaming subscribes to notifications and assembles streamed frames", async () => {
    mockCallRPC.mockImplementation(async (payload: Uint8Array) => {
      const req = Request.decode(payload);
      if (req.getInfo !== undefined) {
        return encodeResponse({ getInfo: { devices: [] } });
      }
      if (req.setFrameStream !== undefined) {
        return encodeResponse({ setFrameStream: { streaming: true } });
      }
      return encodeResponse({ error: { message: "unhandled" } });
    });

    const { Wrapper, emit } = createWrapper();
    const { result } = renderHook(() => usePmw3610(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isAvailable).toBe(true));

    await act(async () => {
      await result.current.startStreaming(0, 2);
    });
    expect(result.current.isStreaming).toBe(true);

    const payload = Notification.encode(
      Notification.create({
        frameStreamChunk: {
          frameId: 7,
          offset: 0,
          data: Uint8Array.from([0x81, 0x82, 0x83, 0x84]),
          totalSize: 4,
          complete: true,
        },
      }),
    ).finish();

    act(() => {
      emit({ subsystemIndex: 12, payload });
    });

    await waitFor(() => expect(result.current.frame).not.toBeNull());
    expect(Array.from(result.current.frame!.bytes)).toEqual([
      0x81, 0x82, 0x83, 0x84,
    ]);
    expect(result.current.frame!.durationMs).toBeNull();
    expect(result.current.frame!.format).toBe(PixelFormat.PIXEL_FORMAT_PG7);
  });

  it("startStreaming assembles RAW8 frames with no invalid bytes", async () => {
    mockCallRPC.mockImplementation(async (payload: Uint8Array) => {
      const req = Request.decode(payload);
      if (req.getInfo !== undefined) {
        return encodeResponse({ getInfo: { devices: [] } });
      }
      if (req.setFrameStream !== undefined) {
        return encodeResponse({ setFrameStream: { streaming: true } });
      }
      return encodeResponse({ error: { message: "unhandled" } });
    });

    const { Wrapper, emit } = createWrapper();
    const { result } = renderHook(() => usePmw3610(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isAvailable).toBe(true));

    await act(async () => {
      await result.current.startStreaming(0, 2);
    });
    expect(result.current.isStreaming).toBe(true);

    const payload = Notification.encode(
      Notification.create({
        frameStreamChunk: {
          frameId: 8,
          offset: 0,
          // Full 8-bit values with bit7 clear on some bytes -- would count
          // as invalid under PG7, but RAW8 has no validity bit.
          data: Uint8Array.from([0x00, 0x10, 0x20, 0x30]),
          totalSize: 4,
          complete: true,
          format: PixelFormat.PIXEL_FORMAT_RAW8,
        },
      }),
    ).finish();

    act(() => {
      emit({ subsystemIndex: 12, payload });
    });

    await waitFor(() => expect(result.current.frame).not.toBeNull());
    expect(Array.from(result.current.frame!.bytes)).toEqual([
      0x00, 0x10, 0x20, 0x30,
    ]);
    expect(result.current.frame!.invalidCount).toBe(0);
    expect(result.current.frame!.format).toBe(PixelFormat.PIXEL_FORMAT_RAW8);
  });

  it("stopStreaming unsubscribes and calls SetFrameStream{enable:false}", async () => {
    mockCallRPC.mockImplementation(async (payload: Uint8Array) => {
      const req = Request.decode(payload);
      if (req.getInfo !== undefined) {
        return encodeResponse({ getInfo: { devices: [] } });
      }
      if (req.setFrameStream !== undefined) {
        return encodeResponse({
          setFrameStream: { streaming: req.setFrameStream.enable },
        });
      }
      return encodeResponse({ error: { message: "unhandled" } });
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePmw3610(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isAvailable).toBe(true));

    await act(async () => {
      await result.current.startStreaming(0, 2);
    });
    expect(result.current.isStreaming).toBe(true);

    await act(async () => {
      await result.current.stopStreaming();
    });
    expect(result.current.isStreaming).toBe(false);

    const setFrameStreamCalls = mockCallRPC.mock.calls.filter((call) => {
      const req = Request.decode(call[0] as Uint8Array);
      return req.setFrameStream !== undefined;
    });
    expect(setFrameStreamCalls.length).toBeGreaterThanOrEqual(2);
    const lastCall = setFrameStreamCalls[setFrameStreamCalls.length - 1];
    const lastReq = Request.decode(lastCall[0] as Uint8Array);
    expect(lastReq.setFrameStream?.enable).toBe(false);
  });
});

// Keep ZMKCustomSubsystem import referenced (mocked above) to satisfy
// lint's no-unused-vars for the mocked module import.
void ZMKCustomSubsystem;
