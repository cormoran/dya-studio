/**
 * Tests for ConnectionPage component
 *
 * This test suite verifies the Connection tab UI, including the
 * ble-management profile listing/switching/unpairing/editing behavior
 * (carried over from the former BLEConnectionsPage), plus the new
 * OS-detection and default-layer integration and graceful degradation
 * when either subsystem is unavailable.
 */
import { useVersionHistory } from "../../hooks/useVersionHistory";
import { createIdleVersionHistory } from "../testUtils/versionHistory";

// Keep unasserted IndexedDB reads/captures out of these editing scenarios.
// Storage/diff units have separate tests; page-to-history wiring is not covered here.
jest.mock("../../hooks/useVersionHistory");

import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { ConnectionPage } from "../ConnectionPage";
import { ConnectionContext } from "../../contexts/DeviceConnectionContext";
import {
  ZMKAppProvider,
  createMockZMKApp,
} from "@cormoran/zmk-studio-react-hook/testing";
import { Os } from "../../proto/cormoran/os_detection/os_detection";

jest.mock("../../hooks/useBLEProfiles");
jest.mock("../../hooks/useOsDetection");
jest.mock("../../hooks/useDefaultLayer");
jest.mock("../../hooks/useLayerNames", () => ({
  ...jest.requireActual("../../hooks/useLayerNames"),
  useLayerNames: jest.fn(),
}));

import { useBLEProfiles } from "../../hooks/useBLEProfiles";
import { useOsDetection } from "../../hooks/useOsDetection";
import { useDefaultLayer } from "../../hooks/useDefaultLayer";
import { useLayerNames } from "../../hooks/useLayerNames";

const mockUseBLEProfiles = useBLEProfiles as jest.MockedFunction<
  typeof useBLEProfiles
>;
const mockUseOsDetection = useOsDetection as jest.MockedFunction<
  typeof useOsDetection
>;
const mockUseDefaultLayer = useDefaultLayer as jest.MockedFunction<
  typeof useDefaultLayer
>;
const mockUseLayerNames = useLayerNames as jest.MockedFunction<
  typeof useLayerNames
>;

describe("ConnectionPage", () => {
  const mockConnectionContext = {
    isConnected: false,
    deviceName: undefined,
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    isLoading: false,
    error: null,
  };

  const mockProfiles = [
    {
      index: 0,
      name: "Work Laptop",
      address: "AA:BB:CC:DD:EE:FF",
      isConnected: true,
      isOpen: false,
      isActive: true,
    },
    {
      index: 1,
      name: "Home PC",
      address: "AA:BB:CC:DD:EE:AA",
      isConnected: false,
      isOpen: false,
      isActive: false,
    },
    {
      index: 2,
      name: "",
      address: "",
      isConnected: false,
      isOpen: true,
      isActive: false,
    },
  ];

  const defaultBLEReturn = {
    isAvailable: true,
    profiles: [] as typeof mockProfiles,
    maxProfiles: 5,
    isLoading: false,
    error: null,
    outputPriority: null,
    loadProfiles: jest.fn(),
    switchProfile: jest.fn(),
    unpairProfile: jest.fn(),
    setProfileName: jest.fn(),
    getOutputPriority: jest.fn(),
    setOutputPriority: jest.fn(),
  };

  const unavailableOsDetection = {
    isAvailable: false,
    state: null,
    isLoading: false,
    error: null,
    load: jest.fn(),
    setBleOverride: jest.fn(),
  };

  const unavailableDefaultLayer = {
    isAvailable: false,
    state: null,
    isLoading: false,
    error: null,
    load: jest.fn(),
    setEndpointLayer: jest.fn(),
    setOsLayer: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useVersionHistory).mockReturnValue(createIdleVersionHistory());
    mockUseBLEProfiles.mockReturnValue({ ...defaultBLEReturn });
    mockUseOsDetection.mockReturnValue({ ...unavailableOsDetection });
    mockUseDefaultLayer.mockReturnValue({ ...unavailableDefaultLayer });
    mockUseLayerNames.mockReturnValue({
      layerNames: ["Base", "Lower", "Raise"],
      isLoading: false,
      load: jest.fn(),
    });
  });

  const renderComponent = (
    connectionOverrides = {},
    bleOverrides = {},
    osDetectionOverrides = {},
    defaultLayerOverrides = {},
  ) => {
    const connectionContext = {
      ...mockConnectionContext,
      ...connectionOverrides,
    };
    mockUseBLEProfiles.mockReturnValue({
      ...defaultBLEReturn,
      ...bleOverrides,
    });
    mockUseOsDetection.mockReturnValue({
      ...unavailableOsDetection,
      ...osDetectionOverrides,
    });
    mockUseDefaultLayer.mockReturnValue({
      ...unavailableDefaultLayer,
      ...defaultLayerOverrides,
    });

    const mockZMKApp = createMockZMKApp();

    return render(
      <ConnectionContext.Provider value={connectionContext}>
        <ZMKAppProvider value={mockZMKApp}>
          <ConnectionPage />
        </ZMKAppProvider>
      </ConnectionContext.Provider>,
    );
  };

  describe("Disconnected State", () => {
    it("should render header correctly", () => {
      renderComponent();
      expect(screen.getByText("Connection")).toBeInTheDocument();
      expect(
        screen.getByText("Manage connections, default layers and OS detection"),
      ).toBeInTheDocument();
    });

    it("should not show profiles when disconnected", () => {
      renderComponent({ isConnected: false }, { profiles: mockProfiles });
      expect(screen.queryByText("Work Laptop")).not.toBeInTheDocument();
    });
  });

  describe("Connected State (ble-management only)", () => {
    it("should show loading state when loading profiles", () => {
      renderComponent({ isConnected: true }, { isLoading: true, profiles: [] });
      expect(screen.getByText("Loading profiles...")).toBeInTheDocument();
    });

    it("should render profile list when connected", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      expect(screen.getByText("Work Laptop")).toBeInTheDocument();
      expect(screen.getByText("Home PC")).toBeInTheDocument();
    });

    it("should apply active profile styling", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      const activeProfileCard = screen
        .getByText("Work Laptop")
        .closest(".glass-card");
      expect(activeProfileCard).toHaveClass("border-[var(--color-cyber)]/40");
    });

    it("should call switchProfile when switch button is clicked", async () => {
      const mockSwitchProfile = jest.fn();
      renderComponent(
        { isConnected: true },
        { profiles: mockProfiles, switchProfile: mockSwitchProfile },
      );

      const switchButton = screen.getAllByRole("button", {
        name: /switch/i,
      })[0];
      fireEvent.click(switchButton);

      await waitFor(() => {
        expect(mockSwitchProfile).toHaveBeenCalledWith(1);
      });
    });

    it("should call unpairProfile with confirmation when unpair is clicked", async () => {
      const mockUnpairProfile = jest.fn();
      window.confirm = jest.fn(() => true);

      renderComponent(
        { isConnected: true },
        { profiles: mockProfiles, unpairProfile: mockUnpairProfile },
      );

      const unpairButton = screen.getAllByRole("button", {
        name: /unpair/i,
      })[0];
      fireEvent.click(unpairButton);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith(
          "Are you sure you want to unpair this device?",
        );
        expect(mockUnpairProfile).toHaveBeenCalledWith(0);
      });
    });

    it("should enter edit mode and save the profile name", async () => {
      const mockSetProfileName = jest.fn();
      renderComponent(
        { isConnected: true },
        { profiles: mockProfiles, setProfileName: mockSetProfileName },
      );

      const editButton = screen.getAllByLabelText("Edit name")[0];
      fireEvent.click(editButton);

      const input = screen.getByDisplayValue("Work Laptop") as HTMLInputElement;
      expect(input.maxLength).toBe(31);
      fireEvent.change(input, { target: { value: "New Name" } });

      const saveButton = screen.getByLabelText("Save name");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSetProfileName).toHaveBeenCalledWith(0, "New Name");
      });
    });

    it("should not render OS/layer sub-rows when subsystems are unavailable", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      expect(screen.queryByText("OS")).not.toBeInTheDocument();
      expect(screen.queryByText("Default Layer")).not.toBeInTheDocument();
      expect(
        screen.getByText(
          "Default layer subsystem is not available for your keyboard.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Status strip", () => {
    it("is hidden when neither os-detection nor default-layer is available", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      expect(screen.queryByText("Current OS")).not.toBeInTheDocument();
    });

    it("shows current OS, active connection, and resolved layer when available", () => {
      renderComponent(
        { isConnected: true },
        { profiles: mockProfiles },
        {
          isAvailable: true,
          state: {
            usb: { connected: false, detected: Os.OS_UNSPECIFIED },
            bleProfiles: [
              {
                index: 0,
                bonded: true,
                connected: true,
                detected: Os.OS_MACOS,
                override: Os.OS_UNSPECIFIED,
                effective: Os.OS_MACOS,
              },
            ],
            activeProfileIndex: 0,
            currentEffective: Os.OS_MACOS,
          },
        },
        {
          isAvailable: true,
          state: {
            endpoints: [],
            osLayers: [],
            activeEndpointIndex: 0,
            currentOs: 2,
            resolvedLayer: 0,
            layerCount: 3,
            osDetectionAvailable: true,
          },
        },
      );

      const statusStrip = screen.getByText("Current OS").closest(".glass-card");
      expect(statusStrip).not.toBeNull();
      expect(
        within(statusStrip as HTMLElement).getByText("macOS"),
      ).toBeInTheDocument();
      expect(screen.getByText("Active Connection")).toBeInTheDocument();
      expect(screen.getByText("Resolved Default Layer")).toBeInTheDocument();
      expect(
        within(statusStrip as HTMLElement).getByText("Base"),
      ).toBeInTheDocument();
    });
  });

  describe("OS override per profile", () => {
    it("fires setBleOverride with the raw enum value when changed", async () => {
      const mockSetBleOverride = jest.fn();
      renderComponent(
        { isConnected: true },
        { profiles: mockProfiles },
        {
          isAvailable: true,
          setBleOverride: mockSetBleOverride,
          state: {
            usb: { connected: false, detected: Os.OS_UNSPECIFIED },
            bleProfiles: [
              {
                index: 0,
                bonded: true,
                connected: true,
                detected: Os.OS_MACOS,
                override: Os.OS_UNSPECIFIED,
                effective: Os.OS_MACOS,
              },
              {
                index: 1,
                bonded: true,
                connected: false,
                detected: Os.OS_WINDOWS,
                override: Os.OS_WINDOWS,
                effective: Os.OS_WINDOWS,
              },
            ],
            activeProfileIndex: 0,
            currentEffective: Os.OS_MACOS,
          },
        },
      );

      const select = screen.getByLabelText("Work Laptop OS override");
      fireEvent.change(select, {
        target: { value: String(Os.OS_LINUX) },
      });

      await waitFor(() => {
        expect(mockSetBleOverride).toHaveBeenCalledWith(0, Os.OS_LINUX);
      });
    });

    it("shows the detected OS in the Auto option even when an override is set", () => {
      renderComponent(
        { isConnected: true },
        { profiles: mockProfiles },
        {
          isAvailable: true,
          state: {
            usb: { connected: false, detected: Os.OS_UNSPECIFIED },
            bleProfiles: [
              {
                index: 0,
                bonded: true,
                connected: true,
                detected: Os.OS_MACOS,
                override: Os.OS_UNSPECIFIED,
                effective: Os.OS_MACOS,
              },
              {
                index: 1,
                bonded: true,
                connected: false,
                detected: Os.OS_WINDOWS,
                override: Os.OS_WINDOWS,
                effective: Os.OS_WINDOWS,
              },
            ],
            activeProfileIndex: 0,
            currentEffective: Os.OS_MACOS,
          },
        },
      );

      const select = screen.getByLabelText("Home PC OS override");
      const options = Array.from(select.querySelectorAll("option")).map(
        (o) => o.textContent,
      );
      expect(options).toContain("Auto: Windows");
    });
  });

  describe("Per-OS Default Layers", () => {
    it("disables per-OS selects and shows a hint when os detection is unavailable", () => {
      renderComponent(
        { isConnected: true },
        { profiles: mockProfiles },
        {},
        {
          isAvailable: true,
          state: {
            endpoints: [],
            osLayers: [
              { os: 0, value: -1 },
              { os: 1, value: -1 },
              { os: 2, value: -1 },
              { os: 3, value: -1 },
              { os: 4, value: -1 },
              { os: 5, value: -1 },
            ],
            activeEndpointIndex: 0,
            currentOs: 0,
            resolvedLayer: -1,
            layerCount: 3,
            osDetectionAvailable: false,
          },
        },
      );

      expect(
        screen.getByText("OS detection is not enabled in this firmware build."),
      ).toBeInTheDocument();
      const windowsSelect = screen.getByLabelText("Windows default layer");
      expect(windowsSelect).toBeDisabled();
    });

    it("fires setOsLayer with the zmk_os value when a per-OS select changes", async () => {
      const mockSetOsLayer = jest.fn();
      renderComponent(
        { isConnected: true },
        { profiles: mockProfiles },
        {},
        {
          isAvailable: true,
          setOsLayer: mockSetOsLayer,
          state: {
            endpoints: [],
            osLayers: [
              { os: 0, value: -1 },
              { os: 1, value: -1 },
              { os: 2, value: 0 },
              { os: 3, value: -1 },
              { os: 4, value: -1 },
              { os: 5, value: -1 },
            ],
            activeEndpointIndex: 0,
            currentOs: 2,
            resolvedLayer: 0,
            layerCount: 3,
            osDetectionAvailable: true,
          },
        },
      );

      const macSelect = screen.getByLabelText("macOS default layer");
      fireEvent.change(macSelect, { target: { value: "1" } });

      await waitFor(() => {
        expect(mockSetOsLayer).toHaveBeenCalledWith(2, 1);
      });
    });
  });

  describe("USB card", () => {
    it("renders a USB card with detected OS and a default layer select", () => {
      renderComponent(
        { isConnected: true },
        { profiles: mockProfiles },
        {
          isAvailable: true,
          state: {
            usb: { connected: true, detected: Os.OS_MACOS },
            bleProfiles: [],
            activeProfileIndex: 0,
            currentEffective: Os.OS_MACOS,
          },
        },
        {
          isAvailable: true,
          state: {
            endpoints: [
              { index: 1, isUsb: true, bleProfileIndex: 0, value: -2 },
            ],
            osLayers: [],
            activeEndpointIndex: 1,
            currentOs: 2,
            resolvedLayer: 0,
            layerCount: 3,
            osDetectionAvailable: true,
          },
        },
      );

      expect(screen.getByLabelText("USB default layer")).toBeInTheDocument();
    });
  });

  describe("Beginner-friendly descriptions", () => {
    const availableDefaultLayer = {
      isAvailable: true,
      state: {
        endpoints: [{ index: 1, isUsb: true, bleProfileIndex: 0, value: -2 }],
        osLayers: [
          { os: 0, value: -1 },
          { os: 2, value: 0 },
        ],
        activeEndpointIndex: 1,
        currentOs: 2,
        resolvedLayer: 0,
        layerCount: 3,
        osDetectionAvailable: true,
      },
    };

    it("explains the Connections section and the OS-detection delegation rule", () => {
      renderComponent(
        { isConnected: true },
        { profiles: mockProfiles },
        {},
        availableDefaultLayer,
      );

      expect(screen.getByText("Connections")).toBeInTheDocument();
      expect(
        screen.getByText(
          /Set a default layer for each connection target\. The layer switches automatically/,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Choosing 'Follow OS detection' applies the Per-OS Default Layers settings below\./,
        ),
      ).toBeInTheDocument();
    });

    it("explains when the Per-OS Default Layers section applies", () => {
      renderComponent(
        { isConnected: true },
        { profiles: mockProfiles },
        {},
        availableDefaultLayer,
      );

      expect(
        screen.getByText(
          /Applied when a connection's default layer is set to 'Follow OS detection'\./,
        ),
      ).toBeInTheDocument();
    });

    it("uses self-explanatory sentinel option labels in layer selects", () => {
      renderComponent(
        { isConnected: true },
        { profiles: mockProfiles },
        {},
        availableDefaultLayer,
      );

      const usbSelect = screen.getByLabelText("USB default layer");
      const options = Array.from(usbSelect.querySelectorAll("option")).map(
        (o) => o.textContent,
      );
      expect(options).toContain("Not set");
      expect(options).toContain("Follow OS detection");
    });

    it("explains what Output Priority does", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      expect(
        screen.getByText(
          "Choose whether USB or Bluetooth is used for keystrokes when both are connected.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Graceful degradation", () => {
    it("still renders BLE rows derived from default-layer/os-detection when ble-management is unavailable", () => {
      renderComponent(
        { isConnected: true },
        { isAvailable: false, profiles: [] },
        {
          isAvailable: true,
          state: {
            usb: { connected: false, detected: Os.OS_UNSPECIFIED },
            bleProfiles: [
              {
                index: 0,
                bonded: true,
                connected: true,
                detected: Os.OS_MACOS,
                override: Os.OS_UNSPECIFIED,
                effective: Os.OS_MACOS,
              },
            ],
            activeProfileIndex: 0,
            currentEffective: Os.OS_MACOS,
          },
        },
        {
          isAvailable: true,
          state: {
            endpoints: [
              { index: 2, isUsb: false, bleProfileIndex: 0, value: -1 },
            ],
            osLayers: [],
            activeEndpointIndex: 2,
            currentOs: 2,
            resolvedLayer: -1,
            layerCount: 3,
            osDetectionAvailable: true,
          },
        },
      );

      expect(screen.getAllByText("BLE profile 0").length).toBeGreaterThan(0);
      expect(
        screen.getByLabelText("BLE profile 0 default layer"),
      ).toBeInTheDocument();
    });
  });
});
