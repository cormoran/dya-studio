import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ZMKAppContext,
  useStudioLockState,
} from "@cormoran/zmk-studio-react-hook";
import { useCustomSubsystem } from "./useCustomSubsystem";
import {
  Notification as Pmw3610Notification,
  PixelFormat,
  Request,
  Response,
  type DeviceInfo,
  type ReadDiagnosticsResponse,
} from "../proto/cormoran/pmw3610/pmw3610";
import {
  assembleFrame,
  chunkOffsets,
  createFrameAssembler,
  isValidPixelByte,
  type FrameChunk,
} from "../lib/pmw3610Frame";
import {
  PMW3610_SOURCE_ALL,
  Pmw3610RelayCorrelator,
} from "../lib/pmw3610Relay";

export const PMW3610_SUBSYSTEM_IDENTIFIER = "cormoran__pmw3610";

export interface Pmw3610DeviceInfo extends DeviceInfo {
  /** 0 is local to the Studio central; positive values are split peripherals. */
  source: number;
}

const CODEC = {
  encode: (request: Request) => Request.encode(request).finish(),
  decode: (payload: Uint8Array) => Response.decode(payload),
};

/** Result of a completed frame capture (one-shot or a completed streamed
 * frame), ready for the section to render to a canvas. */
export interface CapturedFrame {
  bytes: Uint8Array;
  sideLength: number;
  invalidCount: number;
  pixelCount: number;
  complete: boolean;
  /** Wall-clock capture duration; null while streaming (not reported
   * per-frame by the firmware). */
  durationMs: number | null;
  /** Byte format of `bytes` (default PIXEL_FORMAT_PG7 when the firmware
   * response left `format` unset). */
  format: PixelFormat;
}

export interface UsePmw3610Return {
  isAvailable: boolean;
  devices: Pmw3610DeviceInfo[];
  diagnostics: ReadDiagnosticsResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  readDiagnostics: (deviceIndex: number) => Promise<void>;
  /** Latest completed frame (one-shot capture or a completed streamed
   * frame), or null before any capture. */
  frame: CapturedFrame | null;
  isCapturing: boolean;
  isStreaming: boolean;
  /** Frames-per-second measured over ~1s windows while streaming; null
   * otherwise. */
  fps: number | null;
  captureOnce: (deviceIndex: number, side: number) => Promise<void>;
  startStreaming: (deviceIndex: number, side: number) => Promise<void>;
  stopStreaming: () => Promise<void>;
}

export function usePmw3610(): UsePmw3610Return {
  const zmkApp = useContext(ZMKAppContext);
  const { locked } = useStudioLockState();
  // `call` is unlock-gated by the shared useCustomSubsystem wrapper: a locked
  // (SECURED) call opens the unlock modal and is retried after unlock.
  const { subsystem, ready, call } = useCustomSubsystem(
    PMW3610_SUBSYSTEM_IDENTIFIER,
    CODEC,
  );
  const [devices, setDevices] = useState<Pmw3610DeviceInfo[]>([]);
  const [diagnostics, setDiagnostics] =
    useState<ReadDiagnosticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const relayCorrelatorRef = useRef(new Pmw3610RelayCorrelator());

  const subsystemIndex = subsystem?.index;

  const callRpc = useCallback(
    async (request: Request): Promise<Response | null> => {
      if (!ready) return null;
      // `call` handles the locked case (unlock modal + retry, or null if the
      // user dismisses it) via the shared gate.
      const resp = await call(request);
      if (resp?.deferred) {
        return relayCorrelatorRef.current.waitFor(resp.deferred.requestId);
      }
      return resp ?? null;
    },
    [ready, call],
  );

  // Relayed requests return immediately with DeferredResponse. Their actual
  // response arrives through this custom-notification subscription.
  useEffect(() => {
    if (!zmkApp || subsystemIndex === undefined) return;
    const correlator = relayCorrelatorRef.current;
    const unsubscribe = zmkApp.onNotification({
      type: "custom",
      subsystemIndex,
      callback: (notification) => {
        correlator.handleNotificationPayload(notification.payload);
      },
    });
    return () => {
      unsubscribe();
      correlator.clear("PMW3610 connection closed");
    };
  }, [zmkApp, subsystemIndex]);

  const refresh = useCallback(async () => {
    if (!ready) return;
    setIsLoading(true);
    setError(null);
    try {
      const resp = await callRpc(
        Request.create({ getInfo: { source: PMW3610_SOURCE_ALL } }),
      );
      if (!resp) return;
      if (resp.error) {
        throw new Error(resp.error.message);
      }
      const discovered: Pmw3610DeviceInfo[] = (resp.getInfo?.devices ?? []).map(
        (device) => ({ ...device, source: 0 }),
      );
      const relayRequestId = resp.getInfo?.relayRequestId ?? 0;
      if (relayRequestId !== 0) {
        const peripheralResponses =
          await relayCorrelatorRef.current.collectBroadcast(relayRequestId);
        for (const { source, response } of peripheralResponses) {
          if (response.error) {
            throw new Error(response.error.message);
          }
          for (const device of response.getInfo?.devices ?? []) {
            discovered.push({ ...device, source });
          }
        }
      }
      setDevices(discovered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [ready, callRpc]);

  const resolveDevice = useCallback(
    (displayIndex: number): Pmw3610DeviceInfo =>
      devices[displayIndex] ?? {
        deviceIndex: displayIndex,
        source: 0,
        ready: false,
        productId: 0,
        revisionId: 0,
        initError: 0,
        runtimeConfig: undefined,
        settingsId: "",
      },
    [devices],
  );

  const readDiagnostics = useCallback(
    async (deviceIndex: number) => {
      setError(null);
      try {
        const device = resolveDevice(deviceIndex);
        const resp = await callRpc(
          Request.create({
            readDiagnostics: {
              deviceIndex: device.deviceIndex,
              source: device.source,
            },
          }),
        );
        if (!resp) return;
        if (resp.error) {
          throw new Error(resp.error.message);
        }
        setDiagnostics(resp.readDiagnostics ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    },
    [callRpc, resolveDevice],
  );

  // Auto-fetch sensor info when the subsystem becomes available.
  useEffect(() => {
    if (ready) {
      void refresh();
    }
  }, [ready, refresh]);

  // Lock-state handling (unlock modal + auto-retry of the failed request on
  // unlock) is centralized in StudioUnlockProvider via `runWithUnlock`.

  // --- Frame capture / streaming (Feature 3) -----------------------------
  const [frame, setFrame] = useState<CapturedFrame | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [fps, setFps] = useState<number | null>(null);

  const frameCountRef = useRef(0);
  const fpsWindowStartRef = useRef(0);
  const unsubscribeStreamRef = useRef<(() => void) | null>(null);
  const streamingDeviceIndexRef = useRef(0);
  const streamingSourceRef = useRef(0);
  // Per-frame_id incremental assembler, keyed so a late chunk from a
  // previous frame_id (should not happen, but notifications are
  // best-effort/unordered in principle) cannot corrupt the current frame.
  const assemblersRef = useRef(
    new Map<number, ReturnType<typeof createFrameAssembler>>(),
  );

  const captureOnce = useCallback(
    async (deviceIndex: number, side: number) => {
      setIsCapturing(true);
      setError(null);
      try {
        const device = resolveDevice(deviceIndex);
        const captureResp = await callRpc(
          Request.create({
            captureFrame: {
              deviceIndex: device.deviceIndex,
              pixelCount: side * side,
              source: device.source,
            },
          }),
        );
        if (!captureResp) return;
        if (captureResp.error) {
          throw new Error(captureResp.error.message);
        }
        const captureFrame = captureResp.captureFrame;
        if (!captureFrame) {
          throw new Error("CaptureFrame response missing capture_frame field");
        }

        const chunkSize = captureFrame.chunkSize || 128;
        const totalLength = captureFrame.pixelCount;
        const offsets = chunkOffsets(totalLength, chunkSize);
        const chunks: FrameChunk[] = [];
        for (const offset of offsets) {
          const chunkResp = await callRpc(
            Request.create({
              getFrameChunk: {
                frameId: captureFrame.frameId,
                offset,
                source: device.source,
              },
            }),
          );
          if (!chunkResp) return;
          if (chunkResp.error) {
            throw new Error(chunkResp.error.message);
          }
          const chunk = chunkResp.getFrameChunk;
          if (!chunk) {
            throw new Error(
              "GetFrameChunk response missing get_frame_chunk field",
            );
          }
          chunks.push({ offset: chunk.offset, data: chunk.data });
        }

        // Old firmware never sets `format`, which decodes to the enum's zero
        // value -- PIXEL_FORMAT_PG7, already the desired default.
        const format = captureFrame.format ?? PixelFormat.PIXEL_FORMAT_PG7;
        const assembled = assembleFrame(chunks, totalLength, format);
        setFrame({
          bytes: assembled.bytes,
          sideLength: side,
          invalidCount: assembled.invalidCount,
          pixelCount: totalLength,
          complete: captureFrame.complete,
          durationMs: captureFrame.durationMs,
          format,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsCapturing(false);
      }
    },
    [callRpc, resolveDevice],
  );

  const setFrameStreamRpc = useCallback(
    async (
      deviceIndex: number,
      source: number,
      enable: boolean,
      side: number,
    ): Promise<boolean> => {
      const resp = await callRpc(
        Request.create({
          setFrameStream: {
            deviceIndex,
            enable,
            pixelCount: enable ? side * side : 0,
            source,
          },
        }),
      );
      if (!resp) return false;
      if (resp.error) {
        throw new Error(resp.error.message);
      }
      return resp.setFrameStream?.streaming ?? false;
    },
    [callRpc],
  );

  const stopStreaming = useCallback(async () => {
    setIsStreaming(false);
    unsubscribeStreamRef.current?.();
    unsubscribeStreamRef.current = null;
    try {
      await setFrameStreamRpc(
        streamingDeviceIndexRef.current,
        streamingSourceRef.current,
        false,
        0,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [setFrameStreamRpc]);

  const startStreaming = useCallback(
    async (deviceIndex: number, side: number) => {
      if (isStreaming || !zmkApp || subsystemIndex === undefined) return;
      setError(null);
      const device = resolveDevice(deviceIndex);
      streamingDeviceIndexRef.current = device.deviceIndex;
      streamingSourceRef.current = device.source;
      assemblersRef.current.clear();
      frameCountRef.current = 0;
      fpsWindowStartRef.current = performance.now();
      setFps(null);

      try {
        unsubscribeStreamRef.current = zmkApp.onNotification({
          type: "custom",
          subsystemIndex,
          callback: (notification) => {
            let decoded: Pmw3610Notification;
            try {
              decoded = Pmw3610Notification.decode(notification.payload);
            } catch {
              return;
            }
            const chunk = decoded.frameStreamChunk;
            if (!chunk || chunk.source !== streamingSourceRef.current) return;

            const assemblers = assemblersRef.current;
            for (const key of assemblers.keys()) {
              if (key !== chunk.frameId) {
                assemblers.delete(key);
              }
            }
            let assembler = assemblers.get(chunk.frameId);
            if (!assembler) {
              assembler = createFrameAssembler(chunk.totalSize);
              assemblers.set(chunk.frameId, assembler);
            }
            const isComplete = assembler.addChunk(chunk.offset, chunk.data);
            if (!isComplete) return;
            assemblers.delete(chunk.frameId);

            // Old firmware never sets `format`, which decodes to the enum's
            // zero value -- PIXEL_FORMAT_PG7, already the desired default.
            const format = chunk.format ?? PixelFormat.PIXEL_FORMAT_PG7;
            const bytes = assembler.getBytes();
            let invalidCount = 0;
            for (const b of bytes) {
              if (!isValidPixelByte(b, format)) invalidCount++;
            }
            setFrame({
              bytes,
              sideLength: side,
              invalidCount,
              pixelCount: chunk.totalSize,
              complete: chunk.complete,
              durationMs: null,
              format,
            });

            frameCountRef.current++;
            const now = performance.now();
            const elapsed = now - fpsWindowStartRef.current;
            if (elapsed >= 1000) {
              setFps((frameCountRef.current * 1000) / elapsed);
              frameCountRef.current = 0;
              fpsWindowStartRef.current = now;
            }
          },
        });
        const streaming = await setFrameStreamRpc(
          device.deviceIndex,
          device.source,
          true,
          side,
        );
        setIsStreaming(streaming);
        if (!streaming) {
          unsubscribeStreamRef.current?.();
          unsubscribeStreamRef.current = null;
        }
      } catch (err) {
        unsubscribeStreamRef.current?.();
        unsubscribeStreamRef.current = null;
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    },
    [zmkApp, subsystemIndex, isStreaming, resolveDevice, setFrameStreamRpc],
  );

  // Stop the stream when the component unmounts or the connection drops.
  useEffect(() => {
    return () => {
      unsubscribeStreamRef.current?.();
      unsubscribeStreamRef.current = null;
    };
  }, []);
  useEffect(() => {
    if (!zmkApp?.state.connection && unsubscribeStreamRef.current) {
      unsubscribeStreamRef.current();
      unsubscribeStreamRef.current = null;
      setIsStreaming(false);
    }
  }, [zmkApp?.state.connection]);

  // Firmware silently stops the stream loop on lock (it does not, and
  // cannot, notify the client) — reset the UI's streaming state to match so
  // "Start Streaming" becomes available again once unlocked, instead of
  // staying stuck showing "Stop Streaming" for a stream that no longer
  // exists.
  useEffect(() => {
    if (locked && isStreaming) {
      unsubscribeStreamRef.current?.();
      unsubscribeStreamRef.current = null;
      setIsStreaming(false);
    }
    // Only react to the lock transition, not every isStreaming change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  return {
    isAvailable: subsystem !== null,
    devices,
    diagnostics,
    isLoading,
    error,
    refresh,
    readDiagnostics,
    frame,
    isCapturing,
    isStreaming,
    fps,
    captureOnce,
    startStreaming,
    stopStreaming,
  };
}
