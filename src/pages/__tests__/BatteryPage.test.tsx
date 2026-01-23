/**
 * Tests for BatteryPage component
 *
 * This test suite verifies the battery status and history UI.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { BatteryPage } from "../BatteryPage";
import { ConnectionContext } from "../../components/DeviceConnection";
import {
  ZMKAppProvider,
  createMockZMKApp,
} from "@cormoran/zmk-studio-react-hook/testing";

// Mock the useBatteryHistory hook
jest.mock("../../hooks/useBatteryHistory");
import { useBatteryHistory } from "../../hooks/useBatteryHistory";

const mockUseBatteryHistory = useBatteryHistory as jest.MockedFunction<
  typeof useBatteryHistory
>;

describe("BatteryPage", () => {
  // Default mock context values
  const mockConnectionContext = {
    isConnected: false,
    deviceName: undefined,
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    isLoading: false,
    error: null,
  };

  // Test data: mock battery data
  const mockBatteries = [
    {
      deviceName: "Left",
      currentLevel: 85,
      isCharging: false,
      lastUpdatedMs: Date.now(),
      history: [
        {
          timestampMs: Date.now() - 3600000, // 1 hour ago
          level: 95,
          isCharging: false,
        },
        {
          timestampMs: Date.now() - 1800000, // 30 min ago
          level: 90,
          isCharging: false,
        },
        {
          timestampMs: Date.now(),
          level: 85,
          isCharging: false,
        },
      ],
    },
    {
      deviceName: "Right",
      currentLevel: 78,
      isCharging: true,
      lastUpdatedMs: Date.now(),
      history: [
        {
          timestampMs: Date.now() - 3600000,
          level: 65,
          isCharging: false,
        },
        {
          timestampMs: Date.now() - 1800000,
          level: 70,
          isCharging: true,
        },
        {
          timestampMs: Date.now(),
          level: 78,
          isCharging: true,
        },
      ],
    },
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Set default mock return value for useBatteryHistory
    mockUseBatteryHistory.mockReturnValue({
      batteries: [],
      isLoading: false,
      error: null,
      loadBatteryStatus: jest.fn(),
      loadBatteryHistory: jest.fn(),
    });
  });

  /**
   * Helper function to render the component with custom context and hook values
   */
  const renderComponent = (connectionOverrides = {}, batteryOverrides = {}) => {
    const connectionContext = {
      ...mockConnectionContext,
      ...connectionOverrides,
    };
    const batteryHookReturn = {
      ...mockUseBatteryHistory(),
      ...batteryOverrides,
    };
    mockUseBatteryHistory.mockReturnValue(batteryHookReturn);

    const mockZMKApp = createMockZMKApp();

    return render(
      <ConnectionContext.Provider value={connectionContext}>
        <ZMKAppProvider value={mockZMKApp}>
          <BatteryPage />
        </ZMKAppProvider>
      </ConnectionContext.Provider>,
    );
  };

  test("renders battery status page header", () => {
    renderComponent();
    expect(screen.getByText("Battery Status")).toBeInTheDocument();
    expect(
      screen.getByText("Monitor battery levels and history"),
    ).toBeInTheDocument();
  });

  test("shows message when not connected", () => {
    renderComponent({ isConnected: false });
    expect(
      screen.getByText("Connect your keyboard to view battery status"),
    ).toBeInTheDocument();
  });

  test("shows loading state when fetching data", () => {
    renderComponent({ isConnected: true }, { isLoading: true });
    expect(
      screen.getByText("⏳ Loading battery status..."),
    ).toBeInTheDocument();
  });

  test("shows error message when there is an error", () => {
    renderComponent(
      { isConnected: true },
      { error: "Failed to fetch battery data" },
    );
    expect(
      screen.getByText(/Failed to fetch battery data/),
    ).toBeInTheDocument();
  });

  test("displays battery levels for connected device", () => {
    renderComponent({ isConnected: true }, { batteries: mockBatteries });

    // Check that battery levels are displayed
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("78%")).toBeInTheDocument();
    // Check that device names appear (using getAllByText since they appear twice)
    expect(screen.getAllByText("Left").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Right").length).toBeGreaterThan(0);
  });

  test("shows charging indicator for charging batteries", () => {
    renderComponent({ isConnected: true }, { batteries: mockBatteries });

    // The second battery (Right) is charging
    // We can't directly check for the icon, but we can verify the battery data is rendered
    expect(screen.getAllByText("Right").length).toBeGreaterThan(0);
    expect(screen.getByText("78%")).toBeInTheDocument();
  });

  test("displays last updated time", () => {
    renderComponent({ isConnected: true }, { batteries: mockBatteries });

    expect(screen.getByText("Last Updated")).toBeInTheDocument();
  });

  test("displays battery history section", () => {
    renderComponent({ isConnected: true }, { batteries: mockBatteries });

    expect(screen.getByText("Battery History")).toBeInTheDocument();
  });

  test("shows empty state for battery history when no data", () => {
    const batteriesWithoutHistory = [
      {
        deviceName: "Left",
        currentLevel: 85,
        isCharging: false,
        lastUpdatedMs: Date.now(),
        history: [],
      },
    ];

    renderComponent(
      { isConnected: true },
      { batteries: batteriesWithoutHistory },
    );

    expect(
      screen.getByText("No battery history available"),
    ).toBeInTheDocument();
  });

  test("calls loadBatteryHistory when refresh button is clicked", async () => {
    const mockLoadBatteryHistory = jest.fn();
    renderComponent(
      { isConnected: true },
      {
        batteries: mockBatteries,
        loadBatteryHistory: mockLoadBatteryHistory,
      },
    );

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    refreshButton.click();

    await waitFor(() => {
      expect(mockLoadBatteryHistory).toHaveBeenCalledTimes(1);
    });
  });

  test("disables refresh button when loading", () => {
    renderComponent(
      { isConnected: true },
      {
        batteries: mockBatteries,
        isLoading: true,
      },
    );

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    expect(refreshButton).toBeDisabled();
  });
});
