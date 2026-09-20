/**
 * Tests for Demo PMW3610 Handler
 */

import { Pmw3610Handler } from "../demo-pmw3610";
import {
  Notification,
  PixelFormat,
  Request,
} from "../../../proto/cormoran/pmw3610/pmw3610";

describe("Pmw3610Handler", () => {
  let handler: Pmw3610Handler;

  beforeEach(() => {
    handler = new Pmw3610Handler();
  });

  describe("getInfo", () => {
    it("reports one ready device", () => {
      const response = handler.process(Request.create({ getInfo: {} }));
      expect(response.getInfo?.devices).toHaveLength(1);
      expect(response.getInfo?.devices[0].ready).toBe(true);
    });
  });

  describe("readDiagnostics", () => {
    it("returns diagnostics for device 0", () => {
      const response = handler.process(
        Request.create({ readDiagnostics: { deviceIndex: 0 } }),
      );
      expect(response.readDiagnostics).toBeDefined();
      expect(response.readDiagnostics?.squal).toBeGreaterThan(0);
    });

    it("errors for an unknown device index", () => {
      const response = handler.process(
        Request.create({ readDiagnostics: { deviceIndex: 3 } }),
      );
      expect(response.error).toBeDefined();
    });
  });

  describe("captureFrame / getFrameChunk roundtrip", () => {
    it("captures a full frame and reassembles it from chunks", () => {
      const captureResp = handler.process(
        Request.create({
          captureFrame: { deviceIndex: 0, pixelCount: 22 * 22 },
        }),
      );
      expect(captureResp.captureFrame).toBeDefined();
      const { frameId, pixelCount, chunkSize, complete } =
        captureResp.captureFrame!;
      expect(pixelCount).toBe(484);
      expect(complete).toBe(true);

      const collected = new Uint8Array(pixelCount);
      for (let offset = 0; offset < pixelCount; offset += chunkSize) {
        const chunkResp = handler.process(
          Request.create({ getFrameChunk: { frameId, offset } }),
        );
        expect(chunkResp.getFrameChunk).toBeDefined();
        const chunk = chunkResp.getFrameChunk!;
        collected.set(chunk.data, chunk.offset);
      }

      expect(collected.length).toBe(pixelCount);
      // Every byte should have bit7 (PG_VALID) set.
      expect(collected.every((b) => (b & 0x80) !== 0)).toBe(true);
    });

    it("reports PIXEL_FORMAT_PG7 for the one-shot capture path", () => {
      const captureResp = handler.process(
        Request.create({
          captureFrame: { deviceIndex: 0, pixelCount: 22 * 22 },
        }),
      );
      expect(captureResp.captureFrame?.format).toBe(
        PixelFormat.PIXEL_FORMAT_PG7,
      );
    });

    it("defaults to the full 22x22 array when pixelCount is 0", () => {
      const captureResp = handler.process(
        Request.create({ captureFrame: { deviceIndex: 0, pixelCount: 0 } }),
      );
      expect(captureResp.captureFrame?.pixelCount).toBe(484);
    });

    it("errors for an unknown frame id in getFrameChunk", () => {
      const response = handler.process(
        Request.create({ getFrameChunk: { frameId: 9999, offset: 0 } }),
      );
      expect(response.error).toBeDefined();
    });

    it("rejects captureFrame while streaming is active", () => {
      handler.process(
        Request.create({
          setFrameStream: { deviceIndex: 0, enable: true, pixelCount: 100 },
        }),
      );
      const response = handler.process(
        Request.create({ captureFrame: { deviceIndex: 0, pixelCount: 100 } }),
      );
      expect(response.error).toBeDefined();
      handler.process(
        Request.create({
          setFrameStream: { deviceIndex: 0, enable: false, pixelCount: 0 },
        }),
      );
    });
  });

  describe("setFrameStream", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      handler.disconnect();
      jest.useRealTimers();
    });

    it("emits FrameStreamChunk notifications while streaming", () => {
      const received: Uint8Array[] = [];
      handler.notify((payload) => received.push(payload));

      const startResp = handler.process(
        Request.create({
          setFrameStream: { deviceIndex: 0, enable: true, pixelCount: 100 },
        }),
      );
      expect(startResp.setFrameStream?.streaming).toBe(true);

      jest.advanceTimersByTime(250);

      expect(received.length).toBeGreaterThan(0);
      const decoded = Notification.decode(received[0]);
      expect(decoded.frameStreamChunk).toBeDefined();
      expect(decoded.frameStreamChunk?.totalSize).toBe(100);
    });

    it("streams PIXEL_FORMAT_RAW8 frames, exercising the burst-read path", () => {
      const received: Uint8Array[] = [];
      handler.notify((payload) => received.push(payload));

      handler.process(
        Request.create({
          setFrameStream: { deviceIndex: 0, enable: true, pixelCount: 100 },
        }),
      );
      jest.advanceTimersByTime(250);

      expect(received.length).toBeGreaterThan(0);
      const decoded = Notification.decode(received[0]);
      expect(decoded.frameStreamChunk?.format).toBe(
        PixelFormat.PIXEL_FORMAT_RAW8,
      );
    });

    it("stops emitting once disabled", () => {
      const received: Uint8Array[] = [];
      handler.notify((payload) => received.push(payload));

      handler.process(
        Request.create({
          setFrameStream: { deviceIndex: 0, enable: true, pixelCount: 100 },
        }),
      );
      jest.advanceTimersByTime(250);
      const countWhileStreaming = received.length;
      expect(countWhileStreaming).toBeGreaterThan(0);

      const stopResp = handler.process(
        Request.create({
          setFrameStream: { deviceIndex: 0, enable: false, pixelCount: 0 },
        }),
      );
      expect(stopResp.setFrameStream?.streaming).toBe(false);

      jest.advanceTimersByTime(1000);
      expect(received.length).toBe(countWhileStreaming);
    });

    it("stops emitting after disconnect() (timer cleanup)", () => {
      const received: Uint8Array[] = [];
      handler.notify((payload) => received.push(payload));

      handler.process(
        Request.create({
          setFrameStream: { deviceIndex: 0, enable: true, pixelCount: 100 },
        }),
      );
      jest.advanceTimersByTime(250);
      const countBeforeDisconnect = received.length;
      expect(countBeforeDisconnect).toBeGreaterThan(0);

      handler.disconnect();
      jest.advanceTimersByTime(1000);
      expect(received.length).toBe(countBeforeDisconnect);
    });

    it("errors for an unknown device index", () => {
      const response = handler.process(
        Request.create({
          setFrameStream: { deviceIndex: 5, enable: true, pixelCount: 100 },
        }),
      );
      expect(response.error).toBeDefined();
    });
  });

  describe("invalid request", () => {
    it("returns an error for an empty request", () => {
      const response = handler.process(Request.create({}));
      expect(response.error).toBeDefined();
    });
  });
});
