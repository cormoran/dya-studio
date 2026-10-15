/**
 * Tests for TroubleshootingPage
 *
 * Mocks the four data hooks directly (rather than exercising the RPC layer
 * through ZMKAppContext) so each section's "available" / "not available" /
 * error rendering can be asserted independently, following BatteryPage's
 * hook-mocking test convention.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TroubleshootingPage } from "../TroubleshootingPage";
import { useDeviceInfo } from "../../hooks/useDeviceInfo";
import { useWatchdog } from "../../hooks/useWatchdog";
import { useKscanDiagnostics } from "../../hooks/useKscanDiagnostics";
import { usePmw3610 } from "../../hooks/usePmw3610";

jest.mock("../../hooks/useDeviceInfo");
jest.mock("../../hooks/useWatchdog");
jest.mock("../../hooks/useKscanDiagnostics");
jest.mock("../../hooks/usePmw3610");

const mockUseDeviceInfo = useDeviceInfo as jest.MockedFunction<
  typeof useDeviceInfo
>;
const mockUseWatchdog = useWatchdog as jest.MockedFunction<typeof useWatchdog>;
const mockUseKscanDiagnostics = useKscanDiagnostics as jest.MockedFunction<
  typeof useKscanDiagnostics
>;
const mockUsePmw3610 = usePmw3610 as jest.MockedFunction<typeof usePmw3610>;

const writeTextMock = jest.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: writeTextMock },
  configurable: true,
});

function mockAllUnavailable() {
  mockUseDeviceInfo.mockReturnValue({
    isAvailable: false,
    info: null,
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  });
  mockUseWatchdog.mockReturnValue({
    isAvailable: false,
    source: 0,
    setSource: jest.fn(),
    status: null,
    incidents: [],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
    deleteOne: jest.fn(),
    deleteAll: jest.fn(),
  });
  mockUseKscanDiagnostics.mockReturnValue({
    isAvailable: false,
    info: null,
    devices: [],
    stats: [],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
    resetStats: jest.fn(),
    topology: null,
    isLoadingTopology: false,
    topologyError: null,
    loadTopology: jest.fn(),
  });
  mockUsePmw3610.mockReturnValue({
    isAvailable: false,
    devices: [],
    diagnostics: null,
    isLoading: false,
    error: null,
    refresh: jest.fn(),
    readDiagnostics: jest.fn(),
    frame: null,
    isCapturing: false,
    isStreaming: false,
    fps: null,
    captureOnce: jest.fn(),
    startStreaming: jest.fn(),
    stopStreaming: jest.fn(),
  });
}

describe("TroubleshootingPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    writeTextMock.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });
    mockAllUnavailable();
  });

  it("renders the header and guidance card", () => {
    render(<TroubleshootingPage />);

    expect(screen.getByText("Troubleshooting")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Diagnose keyboard problems and create a support report",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Use 'Copy Support Report' and paste the result/),
    ).toBeInTheDocument();
  });

  it("shows four 'not available' notices when no subsystem is present (once expanded)", () => {
    render(<TroubleshootingPage />);

    // One missing section must not affect the others: all four section
    // headings still render, collapsed by default.
    expect(screen.getByText("Device Info")).toBeInTheDocument();
    expect(screen.getByText("Stability (Watchdog)")).toBeInTheDocument();
    expect(screen.getByText("Key Switches")).toBeInTheDocument();
    expect(screen.getByText("Trackball Sensor (PMW3610)")).toBeInTheDocument();

    // Sections start collapsed; nothing is visible until expanded.
    expect(
      screen.queryByText("Not available on this keyboard."),
    ).not.toBeInTheDocument();

    for (const name of [
      "Device Info",
      "Stability (Watchdog)",
      "Key Switches",
      "Trackball Sensor (PMW3610)",
    ]) {
      fireEvent.click(screen.getByRole("button", { name }));
    }

    const notices = screen.getAllByText("Not available on this keyboard.");
    expect(notices).toHaveLength(4);
  });

  it("renders Device Info section content when its data is available", () => {
    mockUseDeviceInfo.mockReturnValue({
      isAvailable: true,
      info: {
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
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<TroubleshootingPage />);

    // Expand every section: the other three still show their
    // not-available notice -- one available subsystem does not affect the
    // others.
    for (const name of [
      "Device Info",
      "Stability (Watchdog)",
      "Key Switches",
      "Trackball Sensor (PMW3610)",
    ]) {
      fireEvent.click(screen.getByRole("button", { name }));
    }

    const notices = screen.getAllByText("Not available on this keyboard.");
    expect(notices).toHaveLength(3);
    expect(screen.getByText("dya_dash")).toBeInTheDocument();
    expect(screen.getByText("ABC123")).toBeInTheDocument();
  });

  it("shows a section error without breaking the other sections", () => {
    mockUseWatchdog.mockReturnValue({
      isAvailable: true,
      source: 0,
      setSource: jest.fn(),
      status: null,
      incidents: [],
      isLoading: false,
      error: "Failed to load incidents",
      refresh: jest.fn(),
      deleteOne: jest.fn(),
      deleteAll: jest.fn(),
    });

    render(<TroubleshootingPage />);

    for (const name of [
      "Device Info",
      "Stability (Watchdog)",
      "Key Switches",
      "Trackball Sensor (PMW3610)",
    ]) {
      fireEvent.click(screen.getByRole("button", { name }));
    }

    expect(screen.getByText("Failed to load incidents")).toBeInTheDocument();
    // Still 3 "not available" notices for the other sections.
    expect(screen.getAllByText("Not available on this keyboard.")).toHaveLength(
      3,
    );
  });

  it("copies the support report to the clipboard when the button is clicked", async () => {
    render(<TroubleshootingPage />);

    const copyButton = screen.getByRole("button", {
      name: /copy support report/i,
    });
    fireEvent.click(copyButton);

    await waitFor(() => expect(writeTextMock).toHaveBeenCalledTimes(1));
    const reportText = writeTextMock.mock.calls[0][0] as string;
    expect(reportText).toContain("# DYA Studio Support Report");
    expect(reportText).toContain("## Device Info (zmk__device_info)");
    expect(
      await screen.findByRole("button", { name: "Copy Support Report" }),
    ).toHaveTextContent("Copied!");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an accessible failure when the clipboard write is rejected", async () => {
    writeTextMock.mockRejectedValueOnce(new Error("Permission denied"));
    render(<TroubleshootingPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "Copy Support Report" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not copy the support report. Check clipboard access and try again.",
    );
    expect(
      screen.getByRole("button", { name: "Copy Support Report" }),
    ).not.toHaveTextContent("Copied!");
  });

  it("shows a failure when the clipboard API is missing", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    render(<TroubleshootingPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "Copy Support Report" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not copy the support report. Check clipboard access and try again.",
    );
    expect(writeTextMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Copy Support Report" }),
    ).not.toHaveTextContent("Copied!");
  });

  it("clears stale success feedback on failure and lets the user retry", async () => {
    render(<TroubleshootingPage />);
    const copyButton = screen.getByRole("button", {
      name: "Copy Support Report",
    });

    fireEvent.click(copyButton);
    expect(
      await screen.findByRole("button", { name: "Copy Support Report" }),
    ).toHaveTextContent("Copied!");

    writeTextMock.mockRejectedValueOnce(new Error("Permission denied"));
    fireEvent.click(copyButton);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy Support Report" }),
    ).not.toHaveTextContent("Copied!");

    writeTextMock.mockResolvedValueOnce(undefined);
    fireEvent.click(copyButton);
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Copy Support Report" }),
      ).toHaveTextContent("Copied!");
    });
  });

  it("has a Refresh All button", () => {
    render(<TroubleshootingPage />);

    expect(
      screen.getByRole("button", { name: /refresh all/i }),
    ).toBeInTheDocument();
  });
});
