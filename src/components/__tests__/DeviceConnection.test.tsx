import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeviceConnectionProvider, ConnectionContext } from "../DeviceConnection";
import { useContext } from "react";

// Extend Navigator interface for testing
interface NavigatorWithSerial extends Navigator {
  serial?: {
    requestPort: () => Promise<{
      open: (options: { baudRate: number }) => Promise<void>;
      close: () => Promise<void>;
    }>;
  };
}

// Mock component to test the connection context
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
      <button onClick={connection.onConnect} data-testid="connect-button">
        Connect
      </button>
      <button onClick={connection.onDisconnect} data-testid="disconnect-button">
        Disconnect
      </button>
    </div>
  );
}

describe("DeviceConnection", () => {
  beforeEach(() => {
    // Reset Web Serial API mock to undefined
    (navigator as NavigatorWithSerial).serial = undefined;
  });

  test("renders with disconnected state initially", () => {
    render(
      <DeviceConnectionProvider>
        <TestComponent />
      </DeviceConnectionProvider>
    );

    expect(screen.getByTestId("connection-status")).toHaveTextContent(
      "Disconnected"
    );
    expect(screen.getByTestId("connect-button")).toBeInTheDocument();
  });

  test("shows error when Web Serial API is not supported", async () => {
    const user = userEvent.setup();

    render(
      <DeviceConnectionProvider>
        <TestComponent />
      </DeviceConnectionProvider>
    );

    const connectButton = screen.getByTestId("connect-button");
    await user.click(connectButton);

    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent(
        "Web Serial API is not supported in this browser"
      );
    });
  });

  test("shows loading state while connecting", async () => {
    const user = userEvent.setup();

    // Mock Web Serial API
    const mockPort = {
      open: jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 100);
          })
      ),
      close: jest.fn().mockResolvedValue(undefined),
    };

    const mockSerial = {
      requestPort: jest.fn().mockResolvedValue(mockPort),
    };

    Object.defineProperty(navigator, "serial", {
      writable: true,
      value: mockSerial,
      configurable: true,
    });

    render(
      <DeviceConnectionProvider>
        <TestComponent />
      </DeviceConnectionProvider>
    );

    const connectButton = screen.getByTestId("connect-button");
    await user.click(connectButton);

    // Should show loading state immediately
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  test("successfully connects to keyboard", async () => {
    const user = userEvent.setup();

    // Mock successful Web Serial API connection
    const mockPort = {
      open: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };

    const mockSerial = {
      requestPort: jest.fn().mockResolvedValue(mockPort),
    };

    Object.defineProperty(navigator, "serial", {
      writable: true,
      value: mockSerial,
      configurable: true,
    });

    render(
      <DeviceConnectionProvider>
        <TestComponent />
      </DeviceConnectionProvider>
    );

    const connectButton = screen.getByTestId("connect-button");
    await user.click(connectButton);

    // Wait for connection to complete
    await waitFor(() => {
      expect(screen.getByTestId("connection-status")).toHaveTextContent(
        "Connected"
      );
    });

    expect(screen.getByTestId("device-name")).toHaveTextContent("DYA Keyboard");
    expect(mockSerial.requestPort).toHaveBeenCalled();
    expect(mockPort.open).toHaveBeenCalledWith({ baudRate: 115200 });
  });

  test("disconnects from keyboard", async () => {
    const user = userEvent.setup();

    // Mock successful Web Serial API connection
    const mockPort = {
      open: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };

    const mockSerial = {
      requestPort: jest.fn().mockResolvedValue(mockPort),
    };

    Object.defineProperty(navigator, "serial", {
      writable: true,
      value: mockSerial,
      configurable: true,
    });

    render(
      <DeviceConnectionProvider>
        <TestComponent />
      </DeviceConnectionProvider>
    );

    // First connect
    const connectButton = screen.getByTestId("connect-button");
    await user.click(connectButton);

    await waitFor(() => {
      expect(screen.getByTestId("connection-status")).toHaveTextContent(
        "Connected"
      );
    });

    // Then disconnect
    const disconnectButton = screen.getByTestId("disconnect-button");
    await user.click(disconnectButton);

    await waitFor(() => {
      expect(screen.getByTestId("connection-status")).toHaveTextContent(
        "Disconnected"
      );
    });

    expect(mockPort.close).toHaveBeenCalled();
    expect(screen.queryByTestId("device-name")).not.toBeInTheDocument();
  });

  test("handles user cancellation of port selection", async () => {
    const user = userEvent.setup();

    // Mock user canceling the port selection
    const mockSerial = {
      requestPort: jest.fn().mockRejectedValue(new DOMException("", "NotFoundError")),
    };

    Object.defineProperty(navigator, "serial", {
      writable: true,
      value: mockSerial,
      configurable: true,
    });

    render(
      <DeviceConnectionProvider>
        <TestComponent />
      </DeviceConnectionProvider>
    );

    const connectButton = screen.getByTestId("connect-button");
    await user.click(connectButton);

    // Should not show error when user cancels
    await waitFor(() => {
      expect(screen.getByTestId("connection-status")).toHaveTextContent(
        "Disconnected"
      );
    });

    expect(screen.queryByTestId("error")).not.toBeInTheDocument();
  });

  test("handles connection errors", async () => {
    const user = userEvent.setup();

    // Mock connection error
    const mockSerial = {
      requestPort: jest
        .fn()
        .mockRejectedValue(new Error("Failed to open serial port")),
    };

    Object.defineProperty(navigator, "serial", {
      writable: true,
      value: mockSerial,
      configurable: true,
    });

    render(
      <DeviceConnectionProvider>
        <TestComponent />
      </DeviceConnectionProvider>
    );

    const connectButton = screen.getByTestId("connect-button");
    await user.click(connectButton);

    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent(
        "Failed to open serial port"
      );
    });
  });
});
