/**
 * Tests for Pmw3610Section: summary badge and the live sensor
 * view (size selector, capture/streaming controls, stats row).
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { Pmw3610Section } from "../Pmw3610Section";
import type { UsePmw3610Return } from "../../../hooks/usePmw3610";

function basePmw3610(
  overrides: Partial<UsePmw3610Return> = {},
): UsePmw3610Return {
  return {
    isAvailable: true,
    devices: [
      {
        source: 2,
        deviceIndex: 0,
        ready: true,
        productId: 0x3610,
        revisionId: 1,
        initError: 0,
        runtimeConfig: undefined,
      },
    ],
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
    ...overrides,
  };
}

describe("Pmw3610Section", () => {
  it("shows an OK summary badge when devices report no init error", () => {
    render(<Pmw3610Section pmw3610={basePmw3610()} />);
    expect(screen.getByText("OK")).toBeInTheDocument();
  });

  it("shows an init error summary badge when a device is not ready", () => {
    render(
      <Pmw3610Section
        pmw3610={basePmw3610({
          devices: [
            {
              source: 2,
              deviceIndex: 0,
              ready: false,
              productId: 0x3610,
              revisionId: 1,
              initError: 2,
              runtimeConfig: undefined,
            },
          ],
        })}
      />,
    );
    expect(screen.getByText("init error")).toBeInTheDocument();
  });

  it("renders the live sensor view with size selector and capture/streaming controls", () => {
    render(<Pmw3610Section pmw3610={basePmw3610()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Trackball Sensor (PMW3610)" }),
    );

    expect(screen.getByText("Live sensor view")).toBeInTheDocument();
    expect(screen.getByText("Capture Once")).toBeInTheDocument();
    expect(screen.getByText("Start Streaming")).toBeInTheDocument();
    expect(screen.getByTestId("pmw3610-frame-canvas")).toBeInTheDocument();
  });

  it("calls captureOnce with the selected device/size when Capture Once is clicked", () => {
    const captureOnce = jest.fn();
    render(<Pmw3610Section pmw3610={basePmw3610({ captureOnce })} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Trackball Sensor (PMW3610)" }),
    );

    fireEvent.click(screen.getByText("Capture Once"));
    expect(captureOnce).toHaveBeenCalledWith(2, 0, 22);
  });

  it("disables Capture Once while streaming", () => {
    render(<Pmw3610Section pmw3610={basePmw3610({ isStreaming: true })} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Trackball Sensor (PMW3610)" }),
    );

    expect(screen.getByText("Capture Once").closest("button")).toBeDisabled();
    expect(screen.getByText("Stop Streaming")).toBeInTheDocument();
  });

  it("shows fps and frame stats while streaming", () => {
    render(
      <Pmw3610Section
        pmw3610={basePmw3610({
          isStreaming: true,
          fps: 4.9,
          frame: {
            bytes: new Uint8Array(4),
            sideLength: 2,
            invalidCount: 1,
            pixelCount: 4,
            complete: true,
            durationMs: null,
          },
        })}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Trackball Sensor (PMW3610)" }),
    );

    expect(screen.getByText("4.9")).toBeInTheDocument();
    expect(screen.getByText("yes")).toBeInTheDocument();
  });

  it("toggles streaming on Start/Stop Streaming click", () => {
    const startStreaming = jest.fn();
    const stopStreaming = jest.fn();
    const { rerender } = render(
      <Pmw3610Section
        pmw3610={basePmw3610({ startStreaming, stopStreaming })}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Trackball Sensor (PMW3610)" }),
    );

    fireEvent.click(screen.getByText("Start Streaming"));
    expect(startStreaming).toHaveBeenCalledWith(2, 0, 22);

    rerender(
      <Pmw3610Section
        pmw3610={basePmw3610({
          startStreaming,
          stopStreaming,
          isStreaming: true,
        })}
      />,
    );
    fireEvent.click(screen.getByText("Stop Streaming"));
    expect(stopStreaming).toHaveBeenCalled();
  });
});
