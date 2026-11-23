/**
 * Tests for the pure support-report builder.
 */
import {
  buildSupportReport,
  findSuspectKeys,
  type SupportReportInput,
} from "../troubleshootingReport";
import { IncidentType } from "../../proto/cormoran/watchdog/watchdog";
import { KscanDriverType } from "../../proto/cormoran/kscan_diagnostics/kscan_diagnostics";

function baseInput(): SupportReportInput {
  return {
    generatedAt: "2026-07-06T00:00:00.000Z",
    deviceName: "dya-dash",
    userAgent: "test-agent/1.0",
    appUrl: "https://example.com/app",
    deviceInfo: { available: false, data: null },
    watchdog: { available: false, data: null },
    kscan: { available: false, data: null },
    pmw3610: { available: false, data: null },
  };
}

describe("buildSupportReport", () => {
  it("includes header context (generated timestamp, device, browser)", () => {
    const report = buildSupportReport(baseInput());

    expect(report).toContain("# DYA Studio Support Report");
    expect(report).toContain("Generated: 2026-07-06T00:00:00.000Z");
    expect(report).toContain("Device: dya-dash");
    expect(report).toContain("Browser: test-agent/1.0");
  });

  it("marks all sections as not available when no subsystem is present", () => {
    const report = buildSupportReport(baseInput());

    const notAvailableCount = (
      report.match(/Not available \(module not installed or disabled\)/g) ?? []
    ).length;
    expect(notAvailableCount).toBe(4);
  });

  it("renders full data for all four sections when available", () => {
    const input: SupportReportInput = {
      ...baseInput(),
      deviceInfo: {
        available: true,
        data: {
          build: {
            zmkVersion: "3.5",
            zmkDirty: false,
            zmkConfigVersion: "v1",
            zmkConfigDirty: false,
            moduleVersion: "m1",
            moduleDirty: false,
            zephyrVersion: "3.7",
            buildTimestamp: "2026-01-01",
            board: "dya_dash",
          },
          hardware: {
            deviceId: "ABC123",
            resetCause: 1 << 3,
            flashSizeKb: 1024,
            sramSizeKb: 256,
          },
          zephyrDevices: [{ name: "kscan0", ready: true }],
          zmkConfig: {
            kscanCompatible: "cormoran,kscan-diagnostics",
            bleEnabled: true,
            bleProfileCount: 5,
            usbEnabled: true,
            splitEnabled: true,
            splitRole: "central",
            displayEnabled: false,
            rgbUnderglowEnabled: false,
            backlightEnabled: false,
            batteryLevelEnabled: true,
          },
          runtime: { uptimeMs: 12345 },
        },
      },
      watchdog: {
        available: true,
        data: {
          status: {
            capacity: 16,
            stored: 2,
            droppedSinceBoot: 0,
            recordingStopped: false,
          },
          incidents: [
            {
              id: 1,
              source: 0,
              type: IncidentType.FREEZE,
              bootOrdinal: 3,
              uptimeS: 1200,
              freeze: { channelId: 0, queueName: "sysworkq" },
            },
          ],
        },
      },
      kscan: {
        available: true,
        data: {
          info: {
            protoVersion: 1,
            layoutCount: 1,
            selectedLayout: 0,
            deviceCount: 1,
            statsEnabled: true,
            maxPositions: 48,
            uptimeMs: 1000,
          },
          devices: [
            {
              deviceIndex: 0,
              nodeName: "kscan0",
              type: KscanDriverType.MATRIX,
              rows: 4,
              columns: 12,
              inputs: 0,
              debouncePressMs: 5,
              debounceReleaseMs: 5,
              debounceScanPeriodMs: 1,
              pollPeriodMs: 0,
              diodeRow2col: true,
              toggleMode: false,
            },
          ],
          stats: [
            {
              position: 0,
              presses: 10,
              releases: 10,
              minPressDurationMs: 30,
              minRepressGapMs: 100,
              repressLt5: 0,
              repressLt10: 0,
              repressLt20: 0,
              repressLt50: 0,
              lastSource: 0,
            },
            {
              position: 21,
              presses: 40,
              releases: 40,
              minPressDurationMs: 30,
              minRepressGapMs: 4,
              repressLt5: 0,
              repressLt10: 3,
              repressLt20: 3,
              repressLt50: 3,
              lastSource: 0,
            },
          ],
        },
      },
      pmw3610: {
        available: true,
        data: {
          devices: [
            {
              ready: true,
              productId: 0x10,
              revisionId: 1,
              initError: 0,
              runtimeConfig: {
                cpi: 800,
                swapXy: false,
                invertX: false,
                invertY: false,
                forceAwake: false,
                smartAlgorithm: true,
                runDownshiftMs: 128,
                rest1DownshiftMs: 40,
                rest2DownshiftMs: 9,
                rest1SampleMs: 10,
                rest2SampleMs: 40,
                rest3SampleMs: 100,
                reportIntervalMinMs: 0,
              },
            },
          ],
          diagnostics: {
            squal: 45,
            shutter: 600,
            pixMax: 90,
            pixAvg: 55,
            pixMin: 30,
          },
        },
      },
    };

    const report = buildSupportReport(input);

    expect(report).toContain("## Device Info (zmk__device_info)");
    expect(report).toContain('"board": "dya_dash"');
    expect(report).toContain("## Stability / Watchdog (cormoran__watchdog)");
    expect(report).toContain(
      "Status: capacity 16, stored 2, dropped 0, recording active",
    );
    expect(report).toContain('"queueName": "sysworkq"');
    expect(report).toContain("## Key Switches (cormoran__kscan_diagnostics)");
    expect(report).toContain(
      "Devices: 1, total presses: 50, suspect keys: 1, untested keys: 0",
    );
    expect(report).toContain("## Trackball (cormoran__pmw3610)");
    expect(report).toContain('"squal": 45');
  });

  it("renders the error message when a section failed to load", () => {
    const input: SupportReportInput = {
      ...baseInput(),
      deviceInfo: {
        available: true,
        data: null,
        error: "Failed to load device info: timeout",
      },
    };

    const report = buildSupportReport(input);

    expect(report).toContain("Failed to load device info: timeout");
    // Only 3 remaining sections should say "not available".
    const notAvailableCount = (
      report.match(/Not available \(module not installed or disabled\)/g) ?? []
    ).length;
    expect(notAvailableCount).toBe(3);
  });

  it("recording-stopped is reflected in the watchdog status line", () => {
    const input: SupportReportInput = {
      ...baseInput(),
      watchdog: {
        available: true,
        data: {
          status: {
            capacity: 16,
            stored: 16,
            droppedSinceBoot: 4,
            recordingStopped: true,
          },
          incidents: [],
        },
      },
    };

    const report = buildSupportReport(input);
    expect(report).toContain("recording paused (storage full)");
  });

  it("never emits Japanese text regardless of caller context", () => {
    // Even if the app is running with a ja locale, buildSupportReport must
    // never call t() -- verify by scanning for any Japanese characters in
    // the report output across a representative input.
    const input: SupportReportInput = {
      ...baseInput(),
      deviceInfo: {
        available: true,
        data: null,
        error: "何かエラー", // Should never appear unless we pass it in ourselves
      },
    };
    const report = buildSupportReport(input);
    // The error message we passed in is Japanese on purpose to prove it's
    // passed through verbatim (not translated) -- but none of the report's
    // OWN generated labels/headings should contain Japanese characters.
    const withoutInjectedError = report.replace("何かエラー", "");
    const japaneseCharPattern = /[぀-ヿ一-鿿]/;
    expect(japaneseCharPattern.test(withoutInjectedError)).toBe(false);
  });

  it("includes resolved file:line even when functionName is unavailable", () => {
    const input: SupportReportInput = {
      ...baseInput(),
      watchdog: {
        available: true,
        data: {
          status: null,
          incidents: [],
          elfFileName: "zephyr.elf",
          elfResolved: [
            {
              id: 1,
              pc: {
                address: 0x80001234,
                file: "/workspace/app/src/main.c",
                line: 42,
              },
              lr: {
                address: 0x00010010,
                functionName: "caller",
                offset: 4,
                file: "/workspace/app/src/caller.c",
                line: 12,
              },
            },
          ],
        },
      },
    };

    const report = buildSupportReport(input);
    expect(report).toContain("0x80001234 → app/src/main.c:42");
    expect(report).toContain("0x00010010 → caller+0x4 (app/src/caller.c:12)");
  });
});

describe("findSuspectKeys", () => {
  it("flags positions with repress chatter", () => {
    const suspects = findSuspectKeys([
      {
        position: 5,
        presses: 10,
        releases: 10,
        minPressDurationMs: 0,
        minRepressGapMs: 0,
        repressLt5: 0,
        repressLt10: 2,
        repressLt20: 2,
        repressLt50: 2,
        lastSource: 0,
      },
    ]);
    expect(suspects).toHaveLength(1);
    expect(suspects[0].position).toBe(5);
  });

  it("flags positions where presses and releases mismatch", () => {
    const suspects = findSuspectKeys([
      {
        position: 7,
        presses: 12,
        releases: 11,
        minPressDurationMs: 0,
        minRepressGapMs: 0,
        repressLt5: 0,
        repressLt10: 0,
        repressLt20: 0,
        repressLt50: 0,
        lastSource: 0,
      },
    ]);
    expect(suspects).toHaveLength(1);
  });

  it("returns an empty array when nothing looks suspect", () => {
    const suspects = findSuspectKeys([
      {
        position: 1,
        presses: 5,
        releases: 5,
        minPressDurationMs: 0,
        minRepressGapMs: 100,
        repressLt5: 0,
        repressLt10: 0,
        repressLt20: 0,
        repressLt50: 0,
        lastSource: 0,
      },
    ]);
    expect(suspects).toHaveLength(0);
  });
});
