/**
 * Tests for BLEConnectionsPage component
 *
 * This test suite verifies the BLE connections management UI,
 * including profile listing, switching, unpairing, and editing.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BLEConnectionsPage } from "../BLEConnectionsPage";
import { ConnectionContext } from "../../components/DeviceConnection";
import {
  ZMKAppProvider,
  createMockZMKApp,
} from "@cormoran/zmk-studio-react-hook/testing";

// Mock the useBLEProfiles hook
jest.mock("../../hooks/useBLEProfiles");
import { useBLEProfiles } from "../../hooks/useBLEProfiles";

const mockUseBLEProfiles = useBLEProfiles as jest.MockedFunction<
  typeof useBLEProfiles
>;

describe("BLEConnectionsPage", () => {
  // Default mock context values
  const mockConnectionContext = {
    isConnected: false,
    deviceName: undefined,
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    isLoading: false,
    error: null,
  };

  // Test data: mock BLE profiles
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

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Set default mock return value for useBLEProfiles
    mockUseBLEProfiles.mockReturnValue({
      profiles: [],
      maxProfiles: 5,
      isLoading: false,
      error: null,
      loadProfiles: jest.fn(),
      switchProfile: jest.fn(),
      unpairProfile: jest.fn(),
      setProfileName: jest.fn(),
    });
  });

  /**
   * Helper function to render the component with custom context and hook values
   */
  const renderComponent = (connectionOverrides = {}, profileOverrides = {}) => {
    const connectionContext = {
      ...mockConnectionContext,
      ...connectionOverrides,
    };
    const profileHookReturn = { ...mockUseBLEProfiles(), ...profileOverrides };
    mockUseBLEProfiles.mockReturnValue(profileHookReturn);

    const mockZMKApp = createMockZMKApp();

    return render(
      <ConnectionContext.Provider value={connectionContext}>
        <ZMKAppProvider value={mockZMKApp}>
          <BLEConnectionsPage />
        </ZMKAppProvider>
      </ConnectionContext.Provider>,
    );
  };

  describe("Disconnected State", () => {
    it("should render header correctly", () => {
      renderComponent();
      expect(screen.getByText("BLE Connections")).toBeInTheDocument();
      expect(
        screen.getByText("Manage Bluetooth upstream connections"),
      ).toBeInTheDocument();
    });

    it("should show connect message when not connected", () => {
      renderComponent();
      expect(
        screen.getByText("Connect your keyboard to manage BLE profiles"),
      ).toBeInTheDocument();
    });

    it("should show help text with colored border description", () => {
      renderComponent();
      expect(
        screen.getByText(/highlighted with a colored border/),
      ).toBeInTheDocument();
    });

    it("should not show profiles when disconnected", () => {
      renderComponent({ isConnected: false }, { profiles: mockProfiles });
      expect(screen.queryByText("Work Laptop")).not.toBeInTheDocument();
    });
  });

  describe("Connected State", () => {
    it("should show loading state when loading profiles", () => {
      renderComponent({ isConnected: true }, { isLoading: true, profiles: [] });
      expect(screen.getByText("⏳ Loading profiles...")).toBeInTheDocument();
    });

    it("should render profile list when connected", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      expect(screen.getByText("Work Laptop")).toBeInTheDocument();
      expect(screen.getByText("Home PC")).toBeInTheDocument();
    });

    it("should display profile numbers correctly", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("should show profile addresses", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      expect(screen.getByText(/AA:BB:CC:DD:EE:FF/)).toBeInTheDocument();
      expect(screen.getByText(/AA:BB:CC:DD:EE:AA/)).toBeInTheDocument();
    });

    it('should show "Not paired" for empty profiles', () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      expect(screen.getByText("Not paired")).toBeInTheDocument();
    });

    it('should show "Connected" status for connected profile', () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      expect(screen.getByText(/Connected •/)).toBeInTheDocument();
    });

    it("should apply active profile styling", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      const activeProfileCard = screen
        .getByText("Work Laptop")
        .closest(".glass-card");
      expect(activeProfileCard).toHaveClass("border-[var(--color-cyber)]/40");
    });

    it("should show refresh button when profiles exist", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      expect(
        screen.getByRole("button", { name: /refresh/i }),
      ).toBeInTheDocument();
    });

    it("should not show refresh button emoji", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      const refreshButton = screen.getByRole("button", { name: /refresh/i });
      expect(refreshButton.textContent).not.toContain("🔄");
    });
  });

  describe("Profile Actions", () => {
    it("should show unpair button for paired profiles", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      const unpairButtons = screen.getAllByRole("button", { name: /unpair/i });
      // Only paired profiles (index 0 and 1) should have unpair buttons
      expect(unpairButtons).toHaveLength(2);
    });

    it("should show switch button for inactive profiles", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      const switchButtons = screen.getAllByRole("button", { name: /switch/i });
      // Only non-active profiles (index 1 and 2) should have switch buttons
      expect(switchButtons).toHaveLength(2);
    });

    it("should not show switch button for active profile", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      const activeProfileCard = screen
        .getByText("Work Laptop")
        .closest(".glass-card");
      expect(
        activeProfileCard?.querySelector('button[aria-label*="Switch"]'),
      ).not.toBeInTheDocument();
    });

    it("should call switchProfile when switch button is clicked", async () => {
      const mockSwitchProfile = jest.fn();
      renderComponent(
        { isConnected: true },
        { profiles: mockProfiles, switchProfile: mockSwitchProfile },
      );

      // Get the first switch button (for profile index 1)
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
      // Mock the window.confirm dialog
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

    it("should not unpair if confirmation is cancelled", async () => {
      const mockUnpairProfile = jest.fn();
      window.confirm = jest.fn(() => false);

      renderComponent(
        { isConnected: true },
        { profiles: mockProfiles, unpairProfile: mockUnpairProfile },
      );

      const unpairButton = screen.getAllByRole("button", {
        name: /unpair/i,
      })[0];
      fireEvent.click(unpairButton);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalled();
        expect(mockUnpairProfile).not.toHaveBeenCalled();
      });
    });

    it("should call loadProfiles when refresh is clicked", async () => {
      const mockLoadProfiles = jest.fn();
      renderComponent(
        { isConnected: true },
        { profiles: mockProfiles, loadProfiles: mockLoadProfiles },
      );

      const refreshButton = screen.getByRole("button", { name: /refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockLoadProfiles).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Profile Name Editing", () => {
    it("should show edit button for paired profiles", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      const editButtons = screen.getAllByLabelText("Edit name");
      // Only paired profiles (index 0 and 1) should have edit buttons
      expect(editButtons).toHaveLength(2);
    });

    it("should not show edit button for empty profiles", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      const profileCard = screen.getByText("Not paired").closest(".glass-card");
      // Empty profile (index 2) should not have edit button
      expect(
        profileCard?.querySelector('button[aria-label="Edit name"]'),
      ).not.toBeInTheDocument();
    });

    it("should enter edit mode when edit button is clicked", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      const editButton = screen.getAllByLabelText("Edit name")[0];
      fireEvent.click(editButton);

      expect(screen.getByDisplayValue("Work Laptop")).toBeInTheDocument();
      expect(screen.getByLabelText("Save name")).toBeInTheDocument();
      expect(screen.getByLabelText("Cancel editing")).toBeInTheDocument();
    });

    it("should allow editing profile name", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      const editButton = screen.getAllByLabelText("Edit name")[0];
      fireEvent.click(editButton);

      const input = screen.getByDisplayValue("Work Laptop");
      fireEvent.change(input, { target: { value: "New Name" } });
      expect(screen.getByDisplayValue("New Name")).toBeInTheDocument();
    });

    it("should call setProfileName when save is clicked", async () => {
      const mockSetProfileName = jest.fn();
      renderComponent(
        { isConnected: true },
        { profiles: mockProfiles, setProfileName: mockSetProfileName },
      );

      const editButton = screen.getAllByLabelText("Edit name")[0];
      fireEvent.click(editButton);

      const input = screen.getByDisplayValue("Work Laptop");
      fireEvent.change(input, { target: { value: "New Name" } });

      const saveButton = screen.getByLabelText("Save name");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSetProfileName).toHaveBeenCalledWith(0, "New Name");
      });
    });

    it("should cancel editing when cancel button is clicked", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      const editButton = screen.getAllByLabelText("Edit name")[0];
      fireEvent.click(editButton);

      const cancelButton = screen.getByLabelText("Cancel editing");
      fireEvent.click(cancelButton);

      expect(screen.queryByDisplayValue("Work Laptop")).not.toBeInTheDocument();
      expect(screen.getByText("Work Laptop")).toBeInTheDocument();
    });

    it("should enforce 31 character limit on profile names", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });
      const editButton = screen.getAllByLabelText("Edit name")[0];
      fireEvent.click(editButton);

      const input = screen.getByDisplayValue("Work Laptop") as HTMLInputElement;
      expect(input.maxLength).toBe(31);
    });
  });

  describe("Error Handling", () => {
    it("should display error message when error occurs", () => {
      renderComponent(
        { isConnected: true },
        { profiles: [], error: "Failed to load profiles" },
      );
      expect(
        screen.getByText("⚠️ Failed to load profiles"),
      ).toBeInTheDocument();
    });

    it("should disable buttons when loading", () => {
      renderComponent(
        { isConnected: true },
        { profiles: mockProfiles, isLoading: true },
      );

      const switchButton = screen.getAllByRole("button", {
        name: /switch/i,
      })[0];
      const unpairButton = screen.getAllByRole("button", {
        name: /unpair/i,
      })[0];
      const refreshButton = screen.getByRole("button", { name: /refresh/i });

      expect(switchButton).toBeDisabled();
      expect(unpairButton).toBeDisabled();
      expect(refreshButton).toBeDisabled();
    });
  });

  describe("Button Layout", () => {
    it("should maintain consistent button alignment with spacer for active profile", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });

      // Active profile should have a spacer div instead of switch button
      const activeProfileCard = screen
        .getByText("Work Laptop")
        .closest(".glass-card");
      const spacer = activeProfileCard?.querySelector(
        'div[aria-hidden="true"]',
      );
      expect(spacer).toBeInTheDocument();
      expect(spacer).toHaveClass("w-[72px]");
    });

    it("should show unpair button before switch button", () => {
      renderComponent({ isConnected: true }, { profiles: mockProfiles });

      const inactiveProfileCard = screen
        .getByText("Home PC")
        .closest(".glass-card");
      // Get only the action buttons container (last div with flex items-center gap-2)
      const actionButtons = inactiveProfileCard?.querySelector(
        ".flex.items-center.gap-2:last-child",
      );
      const buttons = actionButtons?.querySelectorAll("button");

      // First button should be unpair, second should be switch
      expect(buttons?.[0]?.textContent).toContain("Unpair");
      expect(buttons?.[1]?.textContent).toContain("Switch");
    });
  });
});
