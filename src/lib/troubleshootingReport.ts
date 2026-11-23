/**
 * Support report builder for the Troubleshooting page.
 *
 * Pure function: takes the data fetched by the four troubleshooting
 * sections plus context and returns a Markdown report. The report is
 * ALWAYS in English regardless of the UI language so that keyboard
 * sellers receive a stable, machine-comparable format.
 */

import type { DeviceInfoResponse } from "../proto/zmk/device_info/device_info";
import type {
  Incident,
  StatusResponse,
} from "../proto/cormoran/watchdog/watchdog";
import type {
  Device as KscanDevice,
  Info as KscanInfo,
  PositionStats,
} from "../proto/cormoran/kscan_diagnostics/kscan_diagnostics";
import type {
  DeviceInfo as Pmw3610Device,
  ReadDiagnosticsResponse,
} from "../proto/cormoran/pmw3610/pmw3610";
import type { ResolvedAddress } from "./elfAnalysis";

/** State of one troubleshooting section as fed into the report. */
export interface ReportSection<T> {
  /** Whether the firmware subsystem was found on the connected keyboard. */
  available: boolean;
  /** Latest fetched data, or null when nothing was fetched (yet). */
  data: T | null;
  /** Fetch error message, if the last fetch failed. */
  error?: string | null;
}

export interface ElfResolvedIncident {
  id: number;
  pc: ResolvedAddress & { address: number };
  lr: ResolvedAddress & { address: number };
}

export interface WatchdogReportData {
  status: StatusResponse | null;
  incidents: Incident[];
  /** Present when user uploaded a debug ELF for symbol resolution. */
  elfFileName?: string | null;
  elfResolved?: ElfResolvedIncident[];
}

export interface KscanReportData {
  info: KscanInfo | null;
  devices: KscanDevice[];
  stats: PositionStats[];
}

export interface Pmw3610ReportData {
  devices: Pmw3610Device[];
  diagnostics: ReadDiagnosticsResponse | null;
}

export interface SupportReportInput {
  /** ISO timestamp, passed in by the caller so the function stays pure. */
  generatedAt: string;
  deviceName: string | null;
  userAgent: string;
  appUrl: string;
  deviceInfo: ReportSection<DeviceInfoResponse>;
  watchdog: ReportSection<WatchdogReportData>;
  kscan: ReportSection<KscanReportData>;
  pmw3610: ReportSection<Pmw3610ReportData>;
}

/** Positions whose stats look like chatter or a stuck switch. */
export function findSuspectKeys(stats: PositionStats[]): PositionStats[] {
  return stats.filter((s) => s.repressLt10 > 0 || s.presses !== s.releases);
}

// ts-proto may emit bigint for 64-bit fields; keep JSON.stringify safe.
function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

function jsonBlock(value: unknown): string {
  return ["```json", JSON.stringify(value, jsonReplacer, 2), "```"].join("\n");
}

const NOT_AVAILABLE = "- Not available (module not installed or disabled)";

function sectionBody<T>(
  section: ReportSection<T>,
  render: (data: T) => string[],
): string[] {
  if (!section.available) {
    return [NOT_AVAILABLE];
  }
  if (section.error) {
    return [`- Error: ${section.error}`];
  }
  if (section.data === null) {
    return ["- No data fetched"];
  }
  return render(section.data);
}

export function buildSupportReport(input: SupportReportInput): string {
  const lines: string[] = [
    "# DYA Studio Support Report",
    `- Generated: ${input.generatedAt}`,
    `- Device: ${input.deviceName ?? "(not connected)"}`,
    `- App: ${input.appUrl}`,
    `- Browser: ${input.userAgent}`,
    "",
    "## Device Info (zmk__device_info)",
    ...sectionBody(input.deviceInfo, (data) => [jsonBlock(data)]),
    "",
    "## Stability / Watchdog (cormoran__watchdog)",
    ...sectionBody(input.watchdog, (data) => {
      const body: string[] = [];
      if (data.status) {
        const recording = data.status.recordingStopped
          ? "recording paused (storage full)"
          : "recording active";
        body.push(
          `- Status: capacity ${data.status.capacity}, stored ${data.status.stored}, dropped ${data.status.droppedSinceBoot}, ${recording}`,
        );
      }
      body.push(jsonBlock(data.incidents));
      if (data.elfResolved && data.elfResolved.length > 0) {
        body.push("");
        body.push(
          `### ELF Symbol Resolution (${data.elfFileName ?? "unknown"})`,
        );
        for (const ri of data.elfResolved) {
          const fmt = (
            r: ElfResolvedIncident["pc"] | ElfResolvedIncident["lr"],
          ): string => {
            let s = `0x${(r.address >>> 0).toString(16).padStart(8, "0")}`;
            if (r.functionName) {
              s += ` → ${r.functionName}`;
              if (r.offset) s += `+0x${r.offset.toString(16)}`;
            }
            if (r.file) {
              const parts = r.file.replace(/\\/g, "/").split("/");
              const shortFile = parts.slice(-3).join("/");
              s += r.functionName
                ? ` (${shortFile}${r.line ? `:${r.line}` : ""})`
                : ` → ${shortFile}${r.line ? `:${r.line}` : ""}`;
            }
            return s;
          };
          body.push(`- Incident #${ri.id}: PC ${fmt(ri.pc)}, LR ${fmt(ri.lr)}`);
        }
      }
      return body;
    }),
    "",
    "## Key Switches (cormoran__kscan_diagnostics)",
    ...sectionBody(input.kscan, (data) => {
      const suspectKeys = findSuspectKeys(data.stats);
      const untestedKeys = data.stats.filter(
        (s) => s.presses === 0 && s.releases === 0,
      );
      const totalPresses = data.stats.reduce((sum, s) => sum + s.presses, 0);
      return [
        `- Devices: ${data.devices.length}, total presses: ${totalPresses}, suspect keys: ${suspectKeys.length}, untested keys: ${untestedKeys.length}`,
        jsonBlock({ info: data.info, devices: data.devices, suspectKeys }),
      ];
    }),
    "",
    "## Trackball (cormoran__pmw3610)",
    ...sectionBody(input.pmw3610, (data) => [
      jsonBlock({ devices: data.devices, diagnostics: data.diagnostics }),
    ]),
    "",
  ];
  return lines.join("\n");
}
