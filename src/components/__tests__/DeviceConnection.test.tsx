import {
  render,
  screen,
  waitFor,
  renderHook,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeviceConnectionProvider } from "../DeviceConnection";
import { ConnectionContext } from "../../contexts/DeviceConnectionContext";
import { StrictMode, useContext } from "react";
import {
  useZMKApp,
  CONNECT_TIMEOUT_ERROR,
} from "@cormoran/zmk-studio-react-hook";
import { setupZMKMocks } from "@cormoran/zmk-studio-react-hook/testing";

// Mock the ZMK Studio client
jest.mock("@zmkfirmware/zmk-studio-ts-client", () => ({
  create_rpc_connection: jest.fn(),
  call_rpc: jest.fn(),
}));

// Mock the serial transport
jest.mock("@zmkfirmware/zmk-studio-ts-client/transport/serial", () => ({
  connect: jest.fn(),
}));

// Mock the app-level USB transport selector
jest.mock("../../lib/transport/usb", () => ({
  connect: jest.fn(),
}));

jest.mock("../../lib/transport/demo", () => ({
  connect: jest.fn(),
}));

// Mock the BLE transport
jest.mock("@zmkfirmware/zmk-studio-ts-client/transport/gatt", () => ({
  connect: jest.fn(),
}));

// Test component to verify ConnectionContext values
function TestComponent() {
  const connection = useContext(ConnectionContext);

  return (
    <div>
      <div data-testid="connection-status">
        {connection.isConnected ? "Connected" : "Disconnected"}
      </div>
      {connection.deviceName && (
        <div data-testid="device-name">{connection.deviceName}</div>
      )}
      {connection.isLoading && <div data-testid="loading">Loading...</div>}
      {connection.error && <div data-testid="error">{connection.error}</div>}
      {connection.isReconnecting && (
        <div data-testid="reconnecting">Reconnecting...</div>
      )}
      <button
        onClick={() => connection.onConnect("serial")}
        data-testid="connect-button"
      >
        Connect
      </button>
      <button onClick={connection.onDisconnect} data-testid="disconnect-button">
        Disconnect
      </button>
      <button
        onClick={connection.onCancelReconnect}
        data-testid="cancel-reconnect-button"
      >
        Cancel Reconnect
      </button>
    </div>
  );
}

/** Builds a mock `SerialPort`-like object suitable for the auto-reconnect flow. */
function createMockSerialPort(overrides: Record<string, unknown> = {}) {
  return {
    open: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    getInfo: jest
      .fn()
      .mockReturnValue({ usbVendorId: 0x1234, usbProductId: 0x5678 }),
    // A real ReadableStream so the connect flow can `pipeThrough` it to track
    // packet activity (the serial transport forwards `port.readable` verbatim).
    // `cancel` is stubbed: once the connect flow pipes this stream it becomes
    // locked, and the serial transport's abort handler awaits
    // `port.readable.cancel()` during teardown -- which on a locked stream
    // rejects. In production `create_rpc_connection` drains the pipe so the
    // lock clears; here it's mocked, so keep teardown a graceful no-op.
    readable: Object.assign(new ReadableStream(), {
      cancel: jest.fn().mockResolvedValue(undefined),
    }),
    writable: { close: jest.fn().mockResolvedValue(undefined) },
    ...overrides,
  };
}

/** Makes `navigator.serial.getPorts()` resolve to the given paired ports. */
function setPairedSerialPorts(ports: unknown[]) {
  Object.defineProperty(navigator, "serial", {
    configurable: true,
    value: { getPorts: jest.fn().mockResolvedValue(ports) },
  });
}

type NavigatorWithOptionalSerial = Navigator & { serial?: unknown };

describe("DeviceConnection", () => {
  let mocks: ReturnType<typeof setupZMKMocks>;

  beforeEach(() => {
    // Reset mocks using the test helper
    mocks = setupZMKMocks();
    // Auto-reconnect remembers ports in sessionStorage; start each test clean.
    window.sessionStorage.clear();

    // The connect flow now wraps `transport.readable` in a TransformStream to
    // track packet activity, so a connect function must resolve to a transport
    // with a real readable stream. Default the app-level transport connectors
    // to the library's mock transport (which exposes a real ReadableStream);
    // individual tests override these to simulate failures.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../../lib/transport/usb").connect.mockResolvedValue(
      mocks.mockTransport,
    );
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../../lib/transport/demo").connect.mockResolvedValue(
      mocks.mockTransport,
    );
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@zmkfirmware/zmk-studio-ts-client/transport/gatt").connect.mockResolvedValue(
      mocks.mockTransport,
    );
  });

  afterEach(() => {
    delete (navigator as NavigatorWithOptionalSerial).serial;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("Connection Flow", () => {
    test("successfully connects to keyboard", async () => {
      const user = userEvent.setup();

      // Configure mocks for successful connection
      mocks.mockSuccessfulConnection({
        deviceName: "DYA Keyboard",
        subsystems: [],
      });

      render(
        <DeviceConnectionProvider>
          <TestComponent />
        </DeviceConnectionProvider>,
      );

      const connectButton = screen.getByTestId("connect-button");
      await user.click(connectButton);

      // Wait for connection to complete
      await waitFor(() => {
        expect(screen.getByTestId("connection-status")).toHaveTextContent(
          "Connected",
        );
      });

      // Verify device name is displayed
      expect(screen.getByTestId("device-name")).toHaveTextContent(
        "DYA Keyboard",
      );
    });

    test("disconnects from keyboard", async () => {
      const user = userEvent.setup();

      // Configure mocks for successful connection
      mocks.mockSuccessfulConnection({
        deviceName: "DYA Keyboard",
      });

      render(
        <DeviceConnectionProvider>
          <TestComponent />
        </DeviceConnectionProvider>,
      );

      // Connect first
      await user.click(screen.getByTestId("connect-button"));

      await waitFor(() => {
        expect(screen.getByTestId("connection-status")).toHaveTextContent(
          "Connected",
        );
      });

      // Click disconnect
      const disconnectButton = screen.getByTestId("disconnect-button");
      await user.click(disconnectButton);

      await waitFor(() => {
        expect(screen.getByTestId("connection-status")).toHaveTextContent(
          "Disconnected",
        );
      });

      expect(screen.queryByTestId("device-name")).not.toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    test("shows error when Web Serial API is not supported", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      // Mock connection failure
      mocks.mockFailedConnection(
        "Web Serial API is not supported in this browser",
      );

      render(
        <DeviceConnectionProvider>
          <TestComponent />
        </DeviceConnectionProvider>,
      );

      const connectButton = screen.getByTestId("connect-button");
      await user.click(connectButton);

      await waitFor(() => {
        const errorElement = screen.queryByTestId("error");
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent(
          "Web Serial API is not supported in this browser",
        );
      });

      consoleErrorSpy.mockRestore();
    });

    test("handles connection errors", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      // Mock connection error
      mocks.mockFailedConnection("Failed to open serial port");

      render(
        <DeviceConnectionProvider>
          <TestComponent />
        </DeviceConnectionProvider>,
      );

      const connectButton = screen.getByTestId("connect-button");
      await user.click(connectButton);

      await waitFor(() => {
        expect(screen.getByTestId("error")).toHaveTextContent(
          "Failed to open serial port",
        );
      });

      consoleErrorSpy.mockRestore();
    });

    test("handles device info fetch failure", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      // Mock device info failure
      mocks.mockFailedDeviceInfo();

      render(
        <DeviceConnectionProvider>
          <TestComponent />
        </DeviceConnectionProvider>,
      );

      const connectButton = screen.getByTestId("connect-button");
      await user.click(connectButton);

      await waitFor(() => {
        expect(screen.queryByTestId("error")).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    test("handles user cancellation of port selection", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      // Mock connection failure (user cancelled)
      mocks.mockFailedConnection("User cancelled port selection");

      render(
        <DeviceConnectionProvider>
          <TestComponent />
        </DeviceConnectionProvider>,
      );

      const connectButton = screen.getByTestId("connect-button");
      await user.click(connectButton);

      // Should show error when user cancels
      await waitFor(
        () => {
          expect(screen.queryByTestId("error")).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("useZMKApp Integration", () => {
    test("useZMKApp hook works correctly", async () => {
      // Configure mocks for successful connection
      mocks.mockSuccessfulConnection({
        deviceName: "Test Device",
        subsystems: ["test-subsystem"],
      });

      const { result } = renderHook(() => useZMKApp());

      expect(result.current.isConnected).toBe(false);

      const connectFn = jest.fn().mockResolvedValue(mocks.mockTransport);

      await act(async () => {
        await result.current.connect(connectFn);
      });

      // Wait for connection state to update
      await waitFor(
        () => {
          expect(result.current.isConnected).toBe(true);
        },
        { timeout: 3000 },
      );
      expect(result.current.state.deviceInfo?.name).toBe("Test Device");
    });

    test("findSubsystem works after connection", async () => {
      // Configure mocks for successful connection
      mocks.mockSuccessfulConnection({
        deviceName: "Test Device",
        subsystems: ["custom-subsystem"],
      });

      const { result } = renderHook(() => useZMKApp());

      const connectFn = jest.fn().mockResolvedValue(mocks.mockTransport);

      await act(async () => {
        await result.current.connect(connectFn);
      });

      // Wait for connection to be established
      await waitFor(
        () => {
          expect(result.current.isConnected).toBe(true);
        },
        { timeout: 3000 },
      );

      const subsystem = result.current.findSubsystem("custom-subsystem");
      expect(subsystem).not.toBeNull();
      expect(subsystem?.identifier).toBe("custom-subsystem");
    });

    test("disconnect clears all state", async () => {
      // Configure mocks for successful connection
      mocks.mockSuccessfulConnection({
        deviceName: "Test Device",
        subsystems: [],
      });

      const { result } = renderHook(() => useZMKApp());

      const connectFn = jest.fn().mockResolvedValue(mocks.mockTransport);

      // Connect first
      await act(async () => {
        await result.current.connect(connectFn);
      });

      expect(result.current.isConnected).toBe(true);

      // Then disconnect
      act(() => {
        result.current.disconnect();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.state.deviceInfo).toBeNull();
      expect(result.current.state.connection).toBeNull();
    });
  });

  describe("ConnectionContext Values", () => {
    test("provides correct context values when disconnected", () => {
      render(
        <DeviceConnectionProvider>
          <TestComponent />
        </DeviceConnectionProvider>,
      );

      expect(screen.getByTestId("connection-status")).toHaveTextContent(
        "Disconnected",
      );
      expect(screen.queryByTestId("device-name")).not.toBeInTheDocument();
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      expect(screen.queryByTestId("error")).not.toBeInTheDocument();
    });
  });

  describe("Auto-reconnect on mount", () => {
    test("reconnects demo mode after a page reload", async () => {
      mocks.mockSuccessfulConnection({ deviceName: "Demo Keyboard" });
      window.sessionStorage.setItem("dya-studio:connection-method", "demo");

      render(
        <DeviceConnectionProvider reconnectMinDisplayMs={0}>
          <TestComponent />
        </DeviceConnectionProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("connection-status")).toHaveTextContent(
          "Connected",
        );
      });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      expect(require("../../lib/transport/demo").connect).toHaveBeenCalled();
    });

    test("reconnects a paired serial device under StrictMode", async () => {
      mocks.mockSuccessfulConnection({ deviceName: "Strict Keyboard" });
      setPairedSerialPorts([createMockSerialPort()]);

      render(
        <StrictMode>
          <DeviceConnectionProvider reconnectMinDisplayMs={0}>
            <TestComponent />
          </DeviceConnectionProvider>
        </StrictMode>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("connection-status")).toHaveTextContent(
          "Connected",
        );
      });
    });

    test("renders children in the disconnected state when there is no paired serial port", async () => {
      // jsdom has no navigator.serial by default, so the app-driven
      // auto-reconnect attempt resolves to "nothing to reconnect to" and the
      // normal connect screen shows immediately -- isReconnecting never
      // becomes true.
      render(
        <DeviceConnectionProvider reconnectMinDisplayMs={0}>
          <TestComponent />
        </DeviceConnectionProvider>,
      );

      // Let the auto-reconnect effect (and its microtasks) settle.
      await waitFor(() => {
        expect(screen.getByTestId("connection-status")).toHaveTextContent(
          "Disconnected",
        );
      });
      expect(screen.getByTestId("connect-button")).toBeInTheDocument();
      expect(screen.queryByTestId("device-name")).not.toBeInTheDocument();
      expect(screen.queryByTestId("reconnecting")).not.toBeInTheDocument();
    });

    test("transitions to connected when a previously paired serial port reconnects successfully", async () => {
      mocks.mockSuccessfulConnection({
        deviceName: "Auto Reconnected Keyboard",
      });

      const mockPort = createMockSerialPort();
      setPairedSerialPorts([mockPort]);

      render(
        <DeviceConnectionProvider reconnectMinDisplayMs={0}>
          <TestComponent />
        </DeviceConnectionProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("connection-status")).toHaveTextContent(
          "Connected",
        );
      });
      expect(screen.getByTestId("device-name")).toHaveTextContent(
        "Auto Reconnected Keyboard",
      );
      expect(mockPort.open).toHaveBeenCalledWith({ baudRate: 12500 });
      expect(screen.queryByTestId("reconnecting")).not.toBeInTheDocument();
    });

    test("exposes isReconnecting while the attempt is in flight, then clears it once connected", async () => {
      mocks.mockSuccessfulConnection({ deviceName: "Slow Reconnect" });

      // Keep `port.open()` pending until the test explicitly resolves it, so
      // we can observe the in-between isReconnecting: true state.
      let resolveOpen: () => void = () => {};
      const openPromise = new Promise<void>((resolve) => {
        resolveOpen = resolve;
      });
      const mockPort = createMockSerialPort({
        open: jest.fn().mockReturnValue(openPromise),
      });
      setPairedSerialPorts([mockPort]);

      render(
        <DeviceConnectionProvider reconnectMinDisplayMs={0}>
          <TestComponent />
        </DeviceConnectionProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("reconnecting")).toBeInTheDocument();
      });
      expect(screen.getByTestId("connection-status")).toHaveTextContent(
        "Disconnected",
      );

      resolveOpen();

      await waitFor(() => {
        expect(screen.queryByTestId("reconnecting")).not.toBeInTheDocument();
      });
      await waitFor(() => {
        expect(screen.getByTestId("connection-status")).toHaveTextContent(
          "Connected",
        );
      });
      expect(screen.getByTestId("device-name")).toHaveTextContent(
        "Slow Reconnect",
      );
    });

    test("cancelling a pending reconnect stays disconnected even if the transport later resolves", async () => {
      const user = userEvent.setup();
      mocks.mockSuccessfulConnection({ deviceName: "Should Not Connect" });

      let resolveOpen: () => void = () => {};
      const openPromise = new Promise<void>((resolve) => {
        resolveOpen = resolve;
      });
      const mockPort = createMockSerialPort({
        open: jest.fn().mockReturnValue(openPromise),
      });
      setPairedSerialPorts([mockPort]);

      render(
        <DeviceConnectionProvider reconnectMinDisplayMs={0}>
          <TestComponent />
        </DeviceConnectionProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("reconnecting")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("cancel-reconnect-button"));

      // Cancelling returns to the non-reconnecting disconnected state
      // immediately, without waiting for the transport.
      expect(screen.queryByTestId("reconnecting")).not.toBeInTheDocument();
      expect(screen.getByTestId("connection-status")).toHaveTextContent(
        "Disconnected",
      );

      // Now let the (cancelled) transport resolve -- the app must not
      // become connected even though a transport was obtained.
      await act(async () => resolveOpen());
      // Port closure proves that the late transport was released, rather than
      // asserting the already-disconnected UI before the continuation runs.
      await waitFor(() => expect(mockPort.close).toHaveBeenCalledTimes(1));
      expect(mocks.create_rpc_connection).not.toHaveBeenCalled();

      expect(screen.getByTestId("connection-status")).toHaveTextContent(
        "Disconnected",
      );
      expect(screen.queryByTestId("device-name")).not.toBeInTheDocument();
    });

    test("cancelling while the reconnect is awaiting the RPC handshake resets the loading state instead of leaving the connect screen stuck", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      const mockPort = createMockSerialPort();
      setPairedSerialPorts([mockPort]);

      // The port opens fine, so the reconnect flow reaches `zmkApp.connect()`
      // (which sets `isLoading`) and hangs on the RPC handshake -- `call_rpc`
      // only settles once the connection's AbortSignal fires. This mirrors a
      // real paired-but-unresponsive device sitting in the handshake.
      let capturedSignal: AbortSignal | undefined;
      mocks.create_rpc_connection.mockImplementation(
        (_transport: unknown, opts: { signal: AbortSignal }) => {
          capturedSignal = opts.signal;
          return mocks.mockConnection;
        },
      );
      mocks.call_rpc.mockReset();
      mocks.call_rpc.mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            capturedSignal?.addEventListener("abort", () =>
              reject(capturedSignal?.reason ?? new Error("aborted")),
            );
          }),
      );

      render(
        <DeviceConnectionProvider reconnectMinDisplayMs={0}>
          <TestComponent />
        </DeviceConnectionProvider>,
      );

      // Wait until the handshake is in flight: reconnecting + loading are both
      // shown while `zmkApp.connect()` awaits `call_rpc`.
      await waitFor(() => {
        expect(screen.getByTestId("loading")).toBeInTheDocument();
      });
      expect(screen.getByTestId("reconnecting")).toBeInTheDocument();

      await user.click(screen.getByTestId("cancel-reconnect-button"));

      // Cancelling must abort the in-flight connect so neither the reconnecting
      // overlay nor the connect screen's loading state lingers.
      expect(screen.queryByTestId("reconnecting")).not.toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });
      expect(screen.getByTestId("connection-status")).toHaveTextContent(
        "Disconnected",
      );

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    test("keeps the reconnecting indicator visible for at least reconnectMinDisplayMs even on an instant success", async () => {
      jest.useFakeTimers();
      mocks.mockSuccessfulConnection({ deviceName: "Fast Reconnect" });
      const mockPort = createMockSerialPort();
      setPairedSerialPorts([mockPort]);

      render(
        <DeviceConnectionProvider reconnectMinDisplayMs={300}>
          <TestComponent />
        </DeviceConnectionProvider>,
      );

      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });
      expect(mockPort.open).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("reconnecting")).toBeInTheDocument();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(299);
      });
      expect(screen.getByTestId("reconnecting")).toBeInTheDocument();
      expect(screen.getByTestId("connection-status")).toHaveTextContent(
        "Disconnected",
      );
      expect(mocks.create_rpc_connection).not.toHaveBeenCalled();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(1);
      });
      expect(screen.queryByTestId("reconnecting")).not.toBeInTheDocument();
      expect(screen.getByTestId("connection-status")).toHaveTextContent(
        "Connected",
      );
    });

    test("gives up reconnecting instead of hanging forever when the paired device never answers the handshake", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
      const mockPort = createMockSerialPort();
      setPairedSerialPorts([mockPort]);

      // The device is paired and opens fine, but never responds to the RPC
      // handshake -- `call_rpc`'s pending read only settles once the
      // connection is aborted by the `connectTimeoutMs` watchdog.
      let capturedSignal: AbortSignal | undefined;
      mocks.create_rpc_connection.mockImplementation(
        (_transport: unknown, opts: { signal: AbortSignal }) => {
          capturedSignal = opts.signal;
          return mocks.mockConnection;
        },
      );
      // Drop any queued `mockResolvedValueOnce` responses left over from a
      // previous test's `mockSuccessfulConnection` -- `jest.clearAllMocks()`
      // (run in `beforeEach`) does not clear those queues, only call history.
      mocks.call_rpc.mockReset();
      mocks.call_rpc.mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            capturedSignal?.addEventListener("abort", () =>
              reject(capturedSignal?.reason ?? new Error("aborted")),
            );
          }),
      );

      render(
        <DeviceConnectionProvider
          reconnectMinDisplayMs={0}
          connectTimeoutMs={20}
        >
          <TestComponent />
        </DeviceConnectionProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("error")).toHaveTextContent(
          CONNECT_TIMEOUT_ERROR,
        );
      });
      expect(screen.getByTestId("connection-status")).toHaveTextContent(
        "Disconnected",
      );
      expect(screen.queryByTestId("reconnecting")).not.toBeInTheDocument();

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });
});
