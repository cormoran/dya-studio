/**
 * Tests for KeymapPage component
 *
 * This test suite verifies the keymap editor UI,
 * including layer selection, key interaction, and save/discard operations.
 */
import { useVersionHistory } from "../../hooks/useVersionHistory";
import { createIdleVersionHistory } from "../testUtils/versionHistory";

// Keep unasserted IndexedDB reads/captures out of these editing scenarios.
// Storage/diff units have separate tests; page-to-history wiring is not covered here.
jest.mock("../../hooks/useVersionHistory");

import { act, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KeymapPage } from "../KeymapPage";
import { ConnectionContext } from "../../contexts/DeviceConnectionContext";
import {
  ZMKAppProvider,
  createConnectedMockZMKApp,
  createMockZMKApp,
} from "@cormoran/zmk-studio-react-hook/testing";
import { INPUT_STREAM_IDENTIFIER } from "../../hooks/useInputStream";

// Mock ResizeObserver for tests
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock the useKeymap hook, keeping the real getKeymapLoadingLabel helper so
// the page renders a proper loading label.
jest.mock("../../hooks/useKeymap", () => ({
  ...jest.requireActual("../../hooks/useKeymap"),
  useKeymap: jest.fn(),
}));
jest.mock("../../hooks/usePhysicalLayoutModules");
// Control the proactive lock state the page reads; default to unlocked so the
// existing tests (which expect Save/Reset) keep passing.
jest.mock("@cormoran/zmk-studio-react-hook", () => ({
  ...jest.requireActual("@cormoran/zmk-studio-react-hook"),
  useStudioLockState: jest.fn(() => ({ locked: false, lockState: "unlocked" })),
}));
import { useKeymap } from "../../hooks/useKeymap";
import { usePhysicalLayoutModules } from "../../hooks/usePhysicalLayoutModules";
import { useStudioLockState } from "@cormoran/zmk-studio-react-hook";
import { StudioUnlockProvider } from "../../contexts/StudioUnlockContext";

const mockUseKeymap = useKeymap as jest.MockedFunction<typeof useKeymap>;
const mockUseStudioLockState = useStudioLockState as jest.MockedFunction<
  typeof useStudioLockState
>;
const mockUsePhysicalLayoutModules =
  usePhysicalLayoutModules as jest.MockedFunction<
    typeof usePhysicalLayoutModules
  >;

describe("KeymapPage", () => {
  // Default mock context values
  const mockConnectionContext = {
    isConnected: false,
    deviceName: undefined,
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    isLoading: false,
    error: null,
  };

  // Test data: mock keymap data
  const mockPhysicalLayouts = {
    activeLayoutIndex: 0,
    layouts: [
      {
        name: "Default",
        keys: [
          { width: 100, height: 100, x: 0, y: 0, r: 0, rx: 0, ry: 0 },
          { width: 100, height: 100, x: 100, y: 0, r: 0, rx: 0, ry: 0 },
          { width: 100, height: 100, x: 200, y: 0, r: 0, rx: 0, ry: 0 },
        ],
      },
    ],
  };

  const mockKeymap = {
    layers: [
      {
        id: 0,
        name: "Base",
        bindings: [
          { behaviorId: 1, param1: 0x04, param2: 0 },
          { behaviorId: 1, param1: 0x05, param2: 0 },
          { behaviorId: 1, param1: 0x06, param2: 0 },
        ],
      },
      {
        id: 1,
        name: "Lower",
        bindings: [
          { behaviorId: 2, param1: 0, param2: 0 },
          { behaviorId: 2, param1: 0, param2: 0 },
          { behaviorId: 2, param1: 0, param2: 0 },
        ],
      },
    ],
    availableLayers: 4,
    maxLayerNameLength: 32,
  };

  const mockBehaviors = new Map([
    [1, { id: 1, displayName: "kp", metadata: [] }],
    [2, { id: 2, displayName: "trans", metadata: [] }],
  ]);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useVersionHistory).mockReturnValue(createIdleVersionHistory());
    localStorage.clear();

    // Default to unlocked; locked-specific tests override this.
    mockUseStudioLockState.mockReturnValue({
      locked: false,
      lockState: "unlocked",
    });

    // Set default mock return value for useKeymap
    mockUseKeymap.mockReturnValue({
      physicalLayouts: null,
      keymap: null,
      behaviors: new Map(),
      originalBindings: new Map(),
      hasUnsavedChanges: false,
      isLoading: false,
      loadingProgress: null,
      error: null,
      loadKeymapData: jest.fn(),
      setBinding: jest.fn().mockResolvedValue(true),
      resetBinding: jest.fn().mockResolvedValue(true),
      resetBindingToDefault: jest.fn().mockResolvedValue(true),
      moveLayer: jest.fn().mockResolvedValue(true),
      addLayer: jest.fn().mockResolvedValue({
        index: 0,
        layer: { id: 0, name: "New", bindings: [] },
      }),
      removeLayer: jest.fn().mockResolvedValue(true),
      restoreLayer: jest
        .fn()
        .mockResolvedValue({ id: 0, name: "Restored", bindings: [] }),
      availableLayers: 4,
      removedLayerIds: [],
      saveChanges: jest.fn().mockResolvedValue(true),
      discardChanges: jest.fn().mockResolvedValue(true),
      resetToDefault: jest.fn().mockResolvedValue(true),
      setActiveLayout: jest.fn().mockResolvedValue(true),
      getOriginalBinding: jest.fn().mockReturnValue(null),
      getDefaultBinding: jest.fn().mockReturnValue(null),
      isBindingModified: jest.fn().mockReturnValue(false),
      isFastKeymapAvailable: false,
      isBindingChangedFromDefault: jest.fn().mockReturnValue(false),
      isKeymapChangedFromDefault: false,
      getBehavior: jest.fn(),
      getBindingDisplayName: jest.fn().mockReturnValue("Key"),
    });

    mockUsePhysicalLayoutModules.mockReturnValue({
      isAvailable: false,
      modules: [],
      isLoading: false,
      error: null,
      loadModules: jest.fn(),
    });
  });

  /**
   * Helper function to render the component with custom context and hook values
   */
  const renderComponent = (
    connectionOverrides = {},
    keymapOverrides = {},
    zmkApp = createMockZMKApp(),
  ) => {
    const connectionContext = {
      ...mockConnectionContext,
      ...connectionOverrides,
    };
    const keymapHookReturn = { ...mockUseKeymap(), ...keymapOverrides };
    mockUseKeymap.mockReturnValue(keymapHookReturn);

    return render(
      <ConnectionContext.Provider value={connectionContext}>
        <ZMKAppProvider value={zmkApp}>
          <StudioUnlockProvider>
            <KeymapPage />
          </StudioUnlockProvider>
        </ZMKAppProvider>
      </ConnectionContext.Provider>,
    );
  };

  /** Opens the action-bar dropdown that holds Reset, Discard and the versions. */
  const openResetMenu = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: /Reset/ }));
  };

  const mockPhysicalLayoutModule = {
    kind: "trackball" as const,
    identifier: "trackball0",
    displayName: "Primary Trackball",
    label: "Trackball",
    enabled: true,
    attrs: {
      width: 34,
      height: 34,
      x: 350,
      y: 25,
      r: 0,
      rx: 0,
      ry: 0,
    },
    links: [
      {
        deviceIdentifier: "trackball_sensor",
        subsystemIdentifier: "zmk__trackball",
      },
    ],
  };

  describe("Disconnected State", () => {
    it("should render header correctly", () => {
      renderComponent();
      expect(screen.getByText("Keymap")).toBeInTheDocument();
      expect(
        screen.getByText("Configure key bindings and layers"),
      ).toBeInTheDocument();
    });

    it("should show connect message when not connected", () => {
      renderComponent();
      expect(
        screen.getByText("Connect your keyboard to edit keymaps"),
      ).toBeInTheDocument();
    });

    it("should not show layer tabs when disconnected", () => {
      renderComponent({ isConnected: false }, { keymap: mockKeymap });
      expect(screen.queryByText("Base")).not.toBeInTheDocument();
    });
  });

  describe("Connected State - Loading", () => {
    it("should show loading state", () => {
      renderComponent({ isConnected: true }, { isLoading: true, keymap: null });
      expect(screen.getByText("Loading keymap data...")).toBeInTheDocument();
    });
  });

  describe("Connected State - Error", () => {
    it("should show error message", () => {
      renderComponent(
        { isConnected: true },
        {
          error: "Failed to load keymap",
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
        },
      );
      expect(screen.getByText("Failed to load keymap")).toBeInTheDocument();
    });
  });

  describe("Floating binding editor", () => {
    const setup = async (setBinding = jest.fn().mockResolvedValue(true)) => {
      const user = userEvent.setup();
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: new Map([
            [
              1,
              {
                id: 1,
                displayName: "Key Press",
                metadata: [
                  {
                    param1: [
                      {
                        name: "Key",
                        hidUsage: { keyboardMax: 255, consumerMax: 4095 },
                      },
                    ],
                    param2: [],
                  },
                ],
              },
            ],
            [2, { id: 2, displayName: "Transparent", metadata: [] }],
          ]),
          setBinding,
        },
      );
      await user.click(
        screen.getAllByRole("button", { name: /Key position \d+:/ })[0],
      );
      await user.click(screen.getByRole("button", { name: "Floating mode" }));
      return { user, setBinding };
    };

    it("applies once, advances through every key, and closes at the end", async () => {
      const { user, setBinding } = await setup();
      for (let position = 0; position < 3; position++) {
        expect(screen.getByTestId("binding-editor-target")).toHaveTextContent(
          `Base · Key position ${position}: ${String.fromCharCode(
            65 + position,
          )}`,
        );
        expect(
          screen.getByText(`Base · Key ${position + 1} / 3`),
        ).toBeInTheDocument();
        expect(
          screen.getAllByRole("button", { name: /Key position \d+:/ })[
            position
          ],
        ).toHaveAttribute("aria-current", "true");
        await user.click(
          screen.getByRole("button", { name: "A", exact: true }),
        );
        await waitFor(() =>
          expect(setBinding).toHaveBeenCalledTimes(position + 1),
        );
        expect(setBinding).toHaveBeenLastCalledWith(0, position, {
          behaviorId: 1,
          param1: 0x70004,
          param2: 0,
        });
      }
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("advances on keycode and parameterless behavior selection without closing", async () => {
      const { user, setBinding } = await setup();
      await user.click(screen.getByRole("button", { name: "B", exact: true }));
      expect(setBinding).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Base · Key 2 / 3")).toBeInTheDocument();
      await user.click(
        screen.getByRole("button", { name: "Trans", exact: true }),
      );
      expect(setBinding).toHaveBeenCalledTimes(2);
      expect(setBinding).toHaveBeenLastCalledWith(0, 1, {
        behaviorId: 2,
        param1: 0,
        param2: 0,
      });
      expect(screen.getByText("Base · Key 3 / 3")).toBeInTheDocument();
    });

    it("stays on the selected key when auto advance is off and remembers the setting", async () => {
      const { user, setBinding } = await setup();
      const toggle = screen.getByRole("button", { name: "Auto advance" });
      expect(toggle).toHaveAttribute("aria-pressed", "true");
      await user.click(toggle);
      await user.click(screen.getByRole("button", { name: "A", exact: true }));
      expect(setBinding).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Base · Key 1 / 3")).toBeInTheDocument();
      expect(localStorage.getItem("keymapAutoAdvance")).toBe("false");
      await user.click(screen.getByRole("button", { name: "Next key" }));
      await user.click(screen.getByRole("button", { name: "Next key" }));
      await user.click(screen.getByRole("button", { name: "B", exact: true }));
      expect(screen.getByText("Base · Key 3 / 3")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Auto advance" }));
      await user.click(screen.getByRole("button", { name: "A", exact: true }));
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    });

    it("keeps the current key on failure and allows retry", async () => {
      const { user, setBinding } = await setup(
        jest.fn().mockResolvedValueOnce(false).mockResolvedValue(true),
      );
      await user.click(screen.getByRole("button", { name: "A", exact: true }));
      expect(screen.getByText("Base · Key 1 / 3")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "A", exact: true }));
      expect(setBinding).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Base · Key 2 / 3")).toBeInTheDocument();
    });

    it("does not move a newly clicked key when an earlier request completes", async () => {
      let resolve!: (success: boolean) => void;
      const { user, setBinding } = await setup(
        jest.fn(
          () =>
            new Promise<boolean>((done) => {
              resolve = done;
            }),
        ),
      );
      await user.click(screen.getByRole("button", { name: "A", exact: true }));
      expect(
        screen.getByRole("button", { name: "A", exact: true }),
      ).toBeDisabled();
      await user.click(
        screen.getAllByRole("button", { name: /Key position \d+:/ })[2],
      );
      await act(async () => resolve(true));
      expect(setBinding).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Base · Key 3 / 3")).toBeInTheDocument();
    });

    it("navigates without applying and closes on Escape without writing", async () => {
      const { user, setBinding } = await setup();
      expect(
        screen.getByRole("button", { name: "Previous key" }),
      ).toBeDisabled();
      await user.click(screen.getByRole("button", { name: "Next key" }));
      expect(screen.getByText("Base · Key 2 / 3")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Previous key" }));
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(setBinding).not.toHaveBeenCalled();
    });

    it("switches repeatedly between modes without closing or applying a binding", async () => {
      const { user, setBinding } = await setup();
      for (let attempt = 0; attempt < 3; attempt++) {
        await user.click(screen.getByRole("button", { name: "Dialog mode" }));
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByTestId("binding-editor-target")).toHaveTextContent(
          "Base · Key position 0: A",
        );
        expect(
          screen.getByRole("button", { name: "Close on select" }),
        ).toHaveAttribute("aria-pressed", "true");
        expect(
          screen.getByRole("button", { name: "LCtrl", exact: true }),
        ).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Floating mode" }));
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Close on select" }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "LCtrl", exact: true }),
        ).not.toBeInTheDocument();
      }
      expect(setBinding).not.toHaveBeenCalled();
      expect(localStorage.getItem("keymapSelectorMode")).toBe("floating");
    });

    it("closes when switching layers without applying a draft", async () => {
      const { user, setBinding } = await setup();
      await user.click(screen.getByRole("button", { name: "Lower" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(setBinding).not.toHaveBeenCalled();
    });
  });

  describe("Connected State - Loaded", () => {
    it("should render layer tabs when connected", () => {
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );

      expect(screen.getByText("Base")).toBeInTheDocument();
      expect(screen.getByText("Lower")).toBeInTheDocument();
    });

    it("exposes the keymap controls with names and selection state", () => {
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );

      const layers = screen.getByRole("group", { name: "Keymap layers" });
      expect(
        within(layers).getByRole("button", { name: "Base" }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        within(layers).getByRole("button", { name: "Lower" }),
      ).toHaveAttribute("aria-pressed", "false");
      expect(
        screen.getByRole("combobox", { name: "OS Layout:" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("group", { name: "Keyboard layout for Base" }),
      ).toBeInTheDocument();
      expect(
        screen.getAllByRole("button", { name: /Key position \d+:/ }),
      ).toHaveLength(3);
      expect(screen.getByRole("status")).toHaveTextContent("Saved");
    });

    it("opens mobile keymap settings from the rightmost action and keeps grouped controls usable", async () => {
      const user = userEvent.setup();
      const setActiveLayout = jest.fn().mockResolvedValue(true);
      const physicalLayouts = {
        activeLayoutIndex: 0,
        layouts: [
          mockPhysicalLayouts.layouts[0],
          { ...mockPhysicalLayouts.layouts[0], name: "Alternate" },
        ],
      };
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts,
          behaviors: mockBehaviors,
          setActiveLayout,
        },
        createConnectedMockZMKApp({
          subsystems: [INPUT_STREAM_IDENTIFIER],
        }),
      );

      const trigger = screen.getByRole("button", { name: "Keymap settings" });
      expect(trigger).toBe(
        document.querySelector(".keymap-actions")?.lastElementChild,
      );
      await user.click(trigger);

      const dialog = screen.getByRole("dialog", { name: "Keymap settings" });
      expect(dialog).toHaveClass(
        "fixed",
        "inset-0",
        "h-dvh",
        "w-screen",
        "z-[9999]",
      );
      expect(
        within(dialog).getByRole("heading", { name: "Layer editing" }),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByRole("heading", { name: "Layout and display" }),
      ).toBeInTheDocument();

      const layerButtons = within(dialog).getByRole("group", {
        name: "Current layer",
      });
      await user.click(
        within(layerButtons).getByRole("button", { name: "Lower" }),
      );
      expect(
        within(layerButtons).getByRole("button", { name: "Lower" }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        within(dialog).getByRole("button", {
          name: "Move layer down (lower priority)",
        }),
      ).toBeDisabled();
      expect(
        within(dialog).getByRole("button", {
          name: "Move layer up (higher priority)",
        }),
      ).toHaveTextContent("");

      await user.selectOptions(
        within(dialog).getByLabelText("Physical Layout"),
        "1",
      );
      expect(setActiveLayout).toHaveBeenCalledWith(1);
      expect(within(dialog).getByLabelText("OS Layout")).toBeInTheDocument();
      expect(
        within(dialog).getByLabelText("Toggle stream mode"),
      ).toBeInTheDocument();

      await user.click(within(dialog).getByRole("button", { name: "Close" }));
      expect(
        screen.queryByRole("dialog", { name: "Keymap settings" }),
      ).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it("keeps mobile deleted-layer restore choices to three buttons plus an overflow menu", async () => {
      const user = userEvent.setup();
      const restoreLayer = jest
        .fn()
        .mockResolvedValue({ id: 0, name: "Restored", bindings: [] });
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
          removedLayerIds: [2, 3, 4, 5, 6],
          restoreLayer,
        },
      );

      await user.click(screen.getByRole("button", { name: "Keymap settings" }));
      const dialog = screen.getByRole("dialog", { name: "Keymap settings" });

      expect(
        within(dialog).getByRole("button", { name: "Layer 2" }),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByRole("button", { name: "Layer 3" }),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByRole("button", { name: "Layer 4" }),
      ).toBeInTheDocument();
      expect(
        within(dialog).queryByRole("button", { name: "Layer 5" }),
      ).not.toBeInTheDocument();

      await user.click(
        within(dialog).getByRole("button", {
          name: "Other deleted layers (2)",
        }),
      );
      const menu = screen.getByRole("menu", {
        name: "Other deleted layers",
      });
      await user.click(within(menu).getByRole("menuitem", { name: "Layer 6" }));

      expect(restoreLayer).toHaveBeenCalledWith(6, 2);
      expect(
        screen.queryByRole("menu", { name: "Other deleted layers" }),
      ).not.toBeInTheDocument();
    });

    it("keeps the rename confirmation label visible after opening it from mobile settings", async () => {
      const user = userEvent.setup();
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );

      await user.click(screen.getByRole("button", { name: "Keymap settings" }));
      await user.click(
        within(
          screen.getByRole("dialog", { name: "Keymap settings" }),
        ).getByRole("button", { name: "Rename current layer" }),
      );

      const renameDialog = screen.getByRole("dialog", { name: "Rename Layer" });
      const confirmButton = within(renameDialog).getByRole("button", {
        name: "Rename",
      });
      expect(confirmButton).toHaveTextContent("Rename");
      expect(confirmButton.querySelector(".hidden")).not.toBeInTheDocument();
    });

    it("should show unsaved changes indicator", () => {
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
          hasUnsavedChanges: true,
        },
      );

      expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
      expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    });

    it("should show the saved indicator when there are no unsaved changes", () => {
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
          hasUnsavedChanges: false,
        },
      );

      expect(screen.getByText("Saved")).toBeInTheDocument();
      expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
    });

    it("marks the saved indicator when the keymap differs from the default", () => {
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
          hasUnsavedChanges: false,
          isKeymapChangedFromDefault: true,
        },
      );

      // Still reads "Saved", but tinted electric and carrying the explanatory
      // title (the blue-dot state).
      const label = screen.getByText("Saved");
      expect(label).toBeInTheDocument();
      expect(label.className).toContain("--color-electric");
      expect(
        screen.getByTitle("Saved — changed from the default keymap"),
      ).toBeInTheDocument();
    });

    it("should show save and reset buttons when connected", () => {
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );

      expect(screen.getByText("Save")).toBeInTheDocument();
      expect(screen.getByText("Reset")).toBeInTheDocument();
    });

    it("disables Discard in the reset menu when there are no unsaved changes", async () => {
      const user = userEvent.setup();
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
          hasUnsavedChanges: false,
        },
      );

      await openResetMenu(user);
      expect(screen.getByText("Discard").closest("button")).toBeDisabled();
    });

    it("enables Discard in the reset menu when there are unsaved changes", async () => {
      const user = userEvent.setup();
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
          hasUnsavedChanges: true,
        },
      );

      await openResetMenu(user);
      expect(screen.getByText("Discard").closest("button")).not.toBeDisabled();
    });

    it("disables reset-to-initial-state when the fast-keymap subsystem is unavailable", async () => {
      const user = userEvent.setup();
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
          isFastKeymapAvailable: false,
        },
      );

      await openResetMenu(user);
      expect(
        screen.getByText("Reset to initial state").closest("button"),
      ).toBeDisabled();
    });

    it("resets to default via the confirmation dialog when fast-keymap is available", async () => {
      const user = userEvent.setup();
      const resetToDefault = jest.fn().mockResolvedValue(true);
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
          isFastKeymapAvailable: true,
          resetToDefault,
        },
      );

      await openResetMenu(user);
      const resetOption = screen
        .getByText("Reset to initial state")
        .closest("button");
      expect(resetOption).not.toBeDisabled();
      await user.click(resetOption!);

      // Confirmation dialog appears; reset only fires after confirming.
      expect(screen.getByText("Reset to default keymap?")).toBeInTheDocument();
      expect(resetToDefault).not.toHaveBeenCalled();

      await user.click(screen.getByText("Reset to default"));
      expect(resetToDefault).toHaveBeenCalledTimes(1);
    });

    it("shows a Locked badge instead of Save/Reset when Studio is locked", () => {
      mockUseStudioLockState.mockReturnValue({
        locked: true,
        lockState: "locked",
      });
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );

      expect(screen.getByText("Locked")).toBeInTheDocument();
      expect(screen.queryByText("Save")).not.toBeInTheDocument();
      expect(screen.queryByText("Discard")).not.toBeInTheDocument();
      expect(screen.queryByText("Reset")).not.toBeInTheDocument();
    });

    it("opens the unlock prompt when the Locked badge is clicked", async () => {
      const user = userEvent.setup();
      mockUseStudioLockState.mockReturnValue({
        locked: true,
        lockState: "locked",
      });
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );

      expect(
        screen.queryByText("Keyboard Unlock Required"),
      ).not.toBeInTheDocument();
      await user.click(screen.getByText("Locked"));
      expect(screen.getByText("Keyboard Unlock Required")).toBeInTheDocument();
    });

    it("closes mobile settings before showing the unlock prompt for a layer edit", async () => {
      const user = userEvent.setup();
      mockUseStudioLockState.mockReturnValue({
        locked: true,
        lockState: "locked",
      });
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );

      await user.click(screen.getByRole("button", { name: "Keymap settings" }));
      const settings = screen.getByRole("dialog", { name: "Keymap settings" });
      await user.click(
        within(settings).getByRole("button", { name: "Rename current layer" }),
      );

      expect(
        screen.queryByRole("dialog", { name: "Keymap settings" }),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Keyboard Unlock Required")).toBeInTheDocument();
    });

    it("should show stream mode toggle when input stream subsystem is available", () => {
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
        createConnectedMockZMKApp({
          subsystems: [INPUT_STREAM_IDENTIFIER],
        }),
      );

      expect(screen.getByLabelText("Toggle stream mode")).toBeInTheDocument();
    });

    it("should disable save button when no unsaved changes", () => {
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
          hasUnsavedChanges: false,
        },
      );

      const saveButton = screen.getByText("Save").closest("button");
      expect(saveButton).toBeDisabled();
    });

    it("should enable save button when there are unsaved changes", () => {
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
          hasUnsavedChanges: true,
        },
      );

      const saveButton = screen.getByText("Save").closest("button");
      expect(saveButton).not.toBeDisabled();
    });

    it("should render physical layout modules in the preview", () => {
      mockUsePhysicalLayoutModules.mockReturnValue({
        isAvailable: true,
        modules: [mockPhysicalLayoutModule],
        isLoading: false,
        error: null,
        loadModules: jest.fn(),
      });

      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );

      expect(screen.getByLabelText("Primary Trackball")).toBeInTheDocument();
      expect(screen.getByText("Trackball")).toBeInTheDocument();
    });
  });

  describe("Layer Selection", () => {
    it("should switch layers when clicking layer tab", async () => {
      const user = userEvent.setup();
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );

      const lowerTab = screen.getByText("Lower");
      await user.click(lowerTab);

      // The Lower tab should now have the active styling
      expect(lowerTab.closest("button")).toHaveClass(
        "bg-[var(--color-electric)]/20",
      );
    });
  });

  describe("Layer Reordering", () => {
    it("should show layer reorder buttons", () => {
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );

      expect(
        screen.getByLabelText("Move layer up (higher priority)"),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText("Move layer down (lower priority)"),
      ).toBeInTheDocument();
    });

    it("should disable move up button for first layer", () => {
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );

      const moveUpButton = screen.getByLabelText(
        "Move layer up (higher priority)",
      );
      expect(moveUpButton).toBeDisabled();
    });

    it("should call moveLayer when clicking move down", async () => {
      const user = userEvent.setup();
      const mockMoveLayer = jest.fn().mockResolvedValue(true);
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
          moveLayer: mockMoveLayer,
        },
      );

      const moveDownButton = screen.getByLabelText(
        "Move layer down (lower priority)",
      );
      await user.click(moveDownButton);

      expect(mockMoveLayer).toHaveBeenCalledWith(0, 1);
    });
  });

  describe("Layer Restoration", () => {
    it("opens a popup listing deleted layers and restores the chosen one", async () => {
      const user = userEvent.setup();
      const mockRestoreLayer = jest
        .fn()
        .mockResolvedValue({ id: 3, name: "Sym", bindings: [] });
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
          removedLayerIds: [2, 3],
          restoreLayer: mockRestoreLayer,
        },
      );

      // The popup is closed until the restore button is clicked.
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      await user.click(screen.getByLabelText("Restore deleted layer"));

      // Clicking a specific layer row restores exactly that id, appended to the
      // end of the current layer list (2 active layers -> atIndex 2).
      const menu = screen.getByRole("menu");
      await user.click(within(menu).getByRole("menuitem", { name: /Layer 3/ }));

      expect(mockRestoreLayer).toHaveBeenCalledWith(3, 2);
      // The popup closes after a selection.
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("restore-all row restores every deleted layer in id order", async () => {
      const user = userEvent.setup();
      const mockRestoreLayer = jest
        .fn()
        .mockResolvedValue({ id: 0, name: "R", bindings: [] });
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
          removedLayerIds: [2, 3],
          restoreLayer: mockRestoreLayer,
        },
      );

      await user.click(screen.getByLabelText("Restore deleted layer"));
      const menu = screen.getByRole("menu");
      await user.click(
        within(menu).getByRole("menuitem", {
          name: /Restore all deleted layers/,
        }),
      );

      // Restored in id order, each appended (atIndex advances as they land).
      expect(mockRestoreLayer).toHaveBeenNthCalledWith(1, 2, 2);
      expect(mockRestoreLayer).toHaveBeenNthCalledWith(2, 3, 3);
    });

    it("disables the restore button when there are no deleted layers", () => {
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
          removedLayerIds: [],
        },
      );

      expect(screen.getByLabelText("Restore deleted layer")).toBeDisabled();
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  describe("Unlock Prompt", () => {
    it("should not show unlock prompt by default (unlocked)", () => {
      renderComponent({ isConnected: true });

      expect(
        screen.queryByText("Keyboard Unlock Required"),
      ).not.toBeInTheDocument();
    });

    // Note: Dialog testing requires portal rendering support
    // which may not work in all test environments
  });

  describe("Help Text", () => {
    it("should show help text when connected", () => {
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );

      expect(
        screen.getByText(/Click on a key to modify its binding/),
      ).toBeInTheDocument();
    });

    it("should show different help text when disconnected", () => {
      renderComponent();
      expect(
        screen.getByText(
          "Connect your keyboard to edit keymaps. Click on a key to modify its binding.",
        ),
      ).toBeInTheDocument();
    });
  });
});
