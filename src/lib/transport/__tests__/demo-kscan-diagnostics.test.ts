/**
 * Tests for Demo KScan Diagnostics Handler
 */

import { KscanDiagnosticsHandler } from "../demo-kscan-diagnostics";
import {
  GpioLineKind,
  PeripheralEvent,
  Request,
  Response,
} from "../../../proto/cormoran/kscan_diagnostics/kscan_diagnostics";

describe("KscanDiagnosticsHandler", () => {
  let handler: KscanDiagnosticsHandler;

  beforeEach(() => {
    handler = new KscanDiagnosticsHandler();
  });

  describe("getInfo", () => {
    it("reports one device with stats enabled", () => {
      const response = handler.process(Request.create({ getInfo: {} }));

      expect(response.info).toBeDefined();
      expect(response.info?.deviceCount).toBe(1);
      expect(response.info?.statsEnabled).toBe(true);
      expect(response.info?.maxPositions).toBeGreaterThan(0);
    });
  });

  describe("getDevice", () => {
    it("returns the matrix device's config", () => {
      const response = handler.process(
        Request.create({ getDevice: { deviceIndex: 0 } }),
      );

      expect(response.device).toBeDefined();
      expect(response.device?.rows).toBe(5);
      expect(response.device?.columns).toBe(12);
      expect(response.device?.debouncePressMs).toBe(5);
      expect(response.device?.debounceReleaseMs).toBe(5);
    });

    it("errors for an unknown device index", () => {
      const response = handler.process(
        Request.create({ getDevice: { deviceIndex: 5 } }),
      );
      expect(response.error).toBeDefined();
    });
  });

  describe("getLayout", () => {
    it("returns the DYA Dash layout matching the demo keymap's key count", () => {
      const response = handler.process(
        Request.create({ getLayout: { layoutIndex: 0 } }),
      );

      expect(response.layout).toBeDefined();
      expect(response.layout?.rows).toBe(5);
      expect(response.layout?.columns).toBe(12);
      expect(response.layout?.keyCount).toBe(59);
      expect(response.layout?.deviceIndices).toEqual([
        { leafIndex: 0, rowOffset: 0, colOffset: 0 },
      ]);
    });

    it("errors for an unknown layout index", () => {
      const response = handler.process(
        Request.create({ getLayout: { layoutIndex: 3 } }),
      );
      expect(response.error).toBeDefined();
    });
  });

  describe("getPositionMap pagination", () => {
    it("paginates through the full 5x12 position map", () => {
      const collected: number[] = [];
      let offset = 0;
      for (let i = 0; i < 20; i++) {
        const resp = handler.process(
          Request.create({ getPositionMap: { layoutIndex: 0, offset } }),
        );
        const chunk = resp.positionMap!;
        collected.push(...chunk.cells);
        offset = chunk.offset + chunk.cells.length;
        if (chunk.cells.length === 0 || offset >= chunk.total) break;
      }

      // 5 rows x 12 columns = 60 cells total.
      expect(collected).toHaveLength(60);

      // Every non-zero cell holds position+1; every position 0..58 appears
      // exactly once, and exactly one cell (the last) is unmapped (0).
      const positions = collected.filter((c) => c !== 0).map((c) => c - 1);
      expect(positions).toHaveLength(59);
      expect(new Set(positions).size).toBe(59);
      for (const p of positions) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThan(59);
      }
      expect(collected.filter((c) => c === 0)).toHaveLength(1);
      expect(collected[collected.length - 1]).toBe(0);
    });

    it("errors for an unknown layout index", () => {
      const response = handler.process(
        Request.create({ getPositionMap: { layoutIndex: 1, offset: 0 } }),
      );
      expect(response.error).toBeDefined();
    });
  });

  describe("getGpioPins pagination", () => {
    it("returns 5 row lines on gpio0", () => {
      const response = handler.process(
        Request.create({
          getGpioPins: { deviceIndex: 0, kind: GpioLineKind.ROW, offset: 0 },
        }),
      );
      expect(response.gpioPins?.total).toBe(5);
      expect(response.gpioPins?.pins).toHaveLength(5);
      expect(response.gpioPins?.pins.every((p) => p.port === "gpio0")).toBe(
        true,
      );
      expect(response.gpioPins?.pins.map((p) => p.pin)).toEqual([
        4, 5, 6, 7, 8,
      ]);
    });

    it("returns 12 column lines on gpio1", () => {
      const response = handler.process(
        Request.create({
          getGpioPins: { deviceIndex: 0, kind: GpioLineKind.COL, offset: 0 },
        }),
      );
      expect(response.gpioPins?.total).toBe(12);
      expect(response.gpioPins?.pins).toHaveLength(12);
      expect(response.gpioPins?.pins.every((p) => p.port === "gpio1")).toBe(
        true,
      );
    });

    it("errors for an unknown device index", () => {
      const response = handler.process(
        Request.create({
          getGpioPins: { deviceIndex: 9, kind: GpioLineKind.ROW, offset: 0 },
        }),
      );
      expect(response.error).toBeDefined();
    });
  });

  describe("getStats pagination", () => {
    it("paginates through all positions and finds exactly one chattery key", () => {
      const collected = [];
      let offset = 0;
      for (let i = 0; i < 20; i++) {
        const resp = handler.process(Request.create({ getStats: { offset } }));
        const chunk = resp.stats!;
        collected.push(...chunk.entries);
        offset = chunk.offset + chunk.entries.length;
        if (chunk.entries.length === 0 || offset >= chunk.total) break;
      }

      expect(collected.length).toBeGreaterThan(0);
      // Sanity check pagination actually split across multiple RPC calls.
      const firstPage = handler.process(
        Request.create({ getStats: { offset: 0 } }),
      );
      expect(firstPage.stats!.entries.length).toBeLessThan(collected.length);

      const suspects = collected.filter(
        (s) => s.repressLt10 > 0 || s.presses !== s.releases,
      );
      expect(suspects).toHaveLength(1);
    });

    it("returns an empty page past the end", () => {
      const response = handler.process(
        Request.create({ getStats: { offset: 10000 } }),
      );
      expect(response.stats?.entries).toHaveLength(0);
    });
  });

  describe("resetStats", () => {
    it("zeroes out all counters", () => {
      const resetResp = handler.process(Request.create({ resetStats: {} }));
      expect(resetResp.ok).toBeDefined();

      const statsResp = handler.process(
        Request.create({ getStats: { offset: 0 } }),
      );
      expect(
        statsResp.stats?.entries.every(
          (e) => e.presses === 0 && e.releases === 0 && e.repressLt10 === 0,
        ),
      ).toBe(true);
    });
  });

  describe("invalid request", () => {
    it("returns an error for an empty request", () => {
      const response = handler.process(Request.create({}));
      expect(response.error).toBeDefined();
    });
  });

  describe("queryPeripheral", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });
    it.each([7, 42])(
      "delivers the response with request ID %i and peripheral source",
      (reqId) => {
        const notifications: Uint8Array[] = [];
        handler.notify((data) => notifications.push(data));

        const innerRequest = Request.create({ getInfo: {} });
        const response = handler.process(
          Request.create({
            queryPeripheral: {
              reqId,
              payload: Request.encode(innerRequest).finish(),
            },
          }),
        );

        expect(response.ok).toBeDefined();

        jest.runAllTimers();
        expect(notifications).toHaveLength(1);

        const event = PeripheralEvent.decode(notifications[0]);
        expect(event.source).toBe(1);
        expect(event.reqId).toBe(reqId);

        const innerResponse = Response.decode(event.payload);
        expect(innerResponse.info).toBeDefined();
        expect(innerResponse.info?.deviceCount).toBe(1);
      },
    );
  });
});
