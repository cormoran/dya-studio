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
import { KeyboardLayoutProvider } from "../../contexts/KeyboardLayoutProvider";
import { ConnectionContext } from "../../contexts/DeviceConnectionContext";
import {
  ZMKAppProvider,
  createConnectedMockZMKApp,
  createMockZMKApp,
} from "@cormoran/zmk-studio-react-hook/testing";
import { Request, Response } from "@zmkfirmware/zmk-studio-ts-client";
import {
  get_encoder,
  get_decoder,
} from "@zmkfirmware/zmk-studio-ts-client/framing";
import { connect as connectDemo } from "../../lib/transport/demo";
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
jest.mock("../../hooks/useRuntimeSensorRotate");
jest.mock("../../hooks/useRuntimeCombo", () => ({
  ...jest.requireActual("../../hooks/useRuntimeCombo"),
  useRuntimeCombo: jest.fn(),
}));
jest.mock("../../components/macroCombo/useComboEditor", () => ({
  useComboEditor: jest.fn(),
}));
// Control the proactive lock state the page reads; default to unlocked so the
// existing tests (which expect Save/Reset) keep passing.
jest.mock("@cormoran/zmk-studio-react-hook", () => ({
  ...jest.requireActual("@cormoran/zmk-studio-react-hook"),
  useStudioLockState: jest.fn(() => ({ locked: false, lockState: "unlocked" })),
}));
import { useKeymap } from "../../hooks/useKeymap";
import { useRuntimeSensorRotate } from "../../hooks/useRuntimeSensorRotate";
import { usePhysicalLayoutModules } from "../../hooks/usePhysicalLayoutModules";
import { useRuntimeCombo } from "../../hooks/useRuntimeCombo";
import { useComboEditor } from "../../components/macroCombo/useComboEditor";
import { useStudioLockState } from "@cormoran/zmk-studio-react-hook";
import { StudioUnlockProvider } from "../../contexts/StudioUnlockContext";
import { ComboSource } from "../../proto/cormoran/runtime_combo/runtime_combo";

const mockUseKeymap = useKeymap as jest.MockedFunction<typeof useKeymap>;
const mockUseStudioLockState = useStudioLockState as jest.MockedFunction<
  typeof useStudioLockState
>;
const mockUsePhysicalLayoutModules =
  usePhysicalLayoutModules as jest.MockedFunction<
    typeof usePhysicalLayoutModules
  >;
const mockUseRuntimeCombo = useRuntimeCombo as jest.MockedFunction<
  typeof useRuntimeCombo
>;
const mockUseComboEditor = useComboEditor as jest.MockedFunction<
  typeof useComboEditor
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

    jest.mocked(useRuntimeSensorRotate).mockReturnValue({
      isAvailable: false,
      sensors: [],
      isLoading: false,
      error: null,
      loadSensors: jest.fn(),
      getAllLayerBindings: jest.fn().mockResolvedValue([]),
      setLayerCwBindings: jest.fn(),
      setLayerCcwBindings: jest.fn(),
    });

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
      setLayerName: jest.fn().mockResolvedValue(true),
      maxLayerNameLength: 32,
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

    mockUseRuntimeCombo.mockReturnValue({
      isAvailable: false,
      combos: [],
      globalSettings: null,
      isLoading: false,
      error: null,
      hasPendingChanges: false,
      reload: jest.fn(),
    } as never);

    mockUseComboEditor.mockReturnValue({
      selectedIndex: null,
      draft: {
        index: 0,
        name: "",
        keyPositions: [],
        behavior: { behaviorId: 0, param1: 0, param2: 0 },
        layerMask: 0,
        enabled: true,
        timeoutMs: 0,
        requirePriorIdleMs: 0,
        slowReleaseOverride: 0,
        source: ComboSource.COMBO_SOURCE_EMPTY,
      },
      showBehaviorSelector: false,
      setShowBehaviorSelector: jest.fn(),
      statusMessage: null,
      isAdvancedExpanded: false,
      setIsAdvancedExpanded: jest.fn(),
      modifiedIndices: new Set(),
      globalModifiedFields: new Set(),
      maxCombo: undefined,
      highlightedKeys: new Set(),
      validationError: null,
      selectedCombo: null,
      selectedComboExists: false,
      editorSource: ComboSource.COMBO_SOURCE_EMPTY,
      selectCombo: jest.fn(),
      clearSelection: jest.fn(),
      applyDraftChange: jest.fn(),
      handleNewCombo: jest.fn(),
      handlePositionToggle: jest.fn(),
      handleDeleteCombo: jest.fn(),
      handleResetCombo: jest.fn(),
      handleSlowReleaseChange: jest.fn(),
      handleTimeoutMsChange: jest.fn(),
      handleRequirePriorIdleMsChange: jest.fn(),
      flushPendingWrites: jest.fn(),
      cancelPendingWrites: jest.fn(),
      clearModified: jest.fn(),
    } as never);
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

    const page = () => (
      <ConnectionContext.Provider value={connectionContext}>
        <ZMKAppProvider value={zmkApp}>
          <StudioUnlockProvider>
            <KeyboardLayoutProvider>
              <KeymapPage />
            </KeyboardLayoutProvider>
          </StudioUnlockProvider>
        </ZMKAppProvider>
      </ConnectionContext.Provider>
    );
    const result = render(page());
    return {
      ...result,
      replaceKeymap: (overrides: Partial<ReturnType<typeof useKeymap>>) => {
        mockUseKeymap.mockReturnValue({ ...mockUseKeymap(), ...overrides });
        result.rerender(page());
      },
    };
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
      const actions = screen.getByTestId("binding-editor-actions");
      expect(actions).toHaveClass("ml-auto", "shrink-0");
      expect(
        within(actions).getByRole("button", { name: "Auto advance" }),
      ).toBeInTheDocument();
      expect(
        within(actions).getByRole("button", { name: "Previous key" }),
      ).toBeInTheDocument();
      expect(
        within(actions).getByRole("button", { name: "Next key" }),
      ).toBeInTheDocument();
      expect(
        within(actions).getByRole("button", { name: "Dialog mode" }),
      ).toBeInTheDocument();
      expect(
        within(actions).getByRole("button", {
          name: "Close without applying unfinished edits",
        }),
      ).toBeInTheDocument();
      for (let position = 0; position < 3; position++) {
        expect(screen.getByTestId("binding-editor-target")).toHaveTextContent(
          `Base · Key position ${position}: ${String.fromCharCode(
            65 + position,
          )}`,
        );
        expect(screen.getByText("Press a key")).toBeInTheDocument();
        expect(
          screen.queryByText(/Base · Key \d+ \/ 3/),
        ).not.toBeInTheDocument();
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
      expect(screen.getByTestId("binding-editor-target")).toHaveTextContent(
        "Base · Key position 1:",
      );
      await user.click(
        screen.getByRole("button", { name: "Trans", exact: true }),
      );
      expect(setBinding).toHaveBeenCalledTimes(2);
      expect(setBinding).toHaveBeenLastCalledWith(0, 1, {
        behaviorId: 2,
        param1: 0,
        param2: 0,
      });
      expect(screen.getByTestId("binding-editor-target")).toHaveTextContent(
        "Base · Key position 2:",
      );
    });

    it("stays on the selected key when auto advance is off and remembers the setting", async () => {
      const { user, setBinding } = await setup();
      const toggle = screen.getByRole("button", { name: "Auto advance" });
      expect(toggle).toHaveAttribute("aria-pressed", "true");
      await user.click(toggle);
      await user.click(screen.getByRole("button", { name: "A", exact: true }));
      expect(setBinding).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("binding-editor-target")).toHaveTextContent(
        "Base · Key position 0:",
      );
      expect(localStorage.getItem("keymapAutoAdvance")).toBe("false");
      await user.click(screen.getByRole("button", { name: "Next key" }));
      await user.click(screen.getByRole("button", { name: "Next key" }));
      await user.click(screen.getByRole("button", { name: "B", exact: true }));
      expect(screen.getByTestId("binding-editor-target")).toHaveTextContent(
        "Base · Key position 2:",
      );
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
      expect(screen.getByTestId("binding-editor-target")).toHaveTextContent(
        "Base · Key position 0:",
      );
      await user.click(screen.getByRole("button", { name: "A", exact: true }));
      expect(setBinding).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId("binding-editor-target")).toHaveTextContent(
        "Base · Key position 1:",
      );
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
      expect(screen.getByTestId("binding-editor-target")).toHaveTextContent(
        "Base · Key position 2:",
      );
    });

    it("navigates without applying and closes on Escape without writing", async () => {
      const { user, setBinding } = await setup();
      expect(
        screen.getByRole("button", { name: "Previous key" }),
      ).toBeDisabled();
      await user.click(screen.getByRole("button", { name: "Next key" }));
      expect(screen.getByTestId("binding-editor-target")).toHaveTextContent(
        "Base · Key position 1:",
      );
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

    it("highlights a RAM-only combo item with the green unsaved treatment", () => {
      mockUseRuntimeCombo.mockReturnValue({
        isAvailable: true,
        combos: [
          {
            index: 0,
            name: "Escape chord",
            keyPositions: [0, 1],
            behavior: { behaviorId: 1, param1: 0x29, param2: 0 },
            layerMask: 0,
            enabled: true,
            timeoutMs: 0,
            requirePriorIdleMs: 0,
            slowReleaseOverride: 0,
            source: ComboSource.COMBO_SOURCE_DEFAULT,
          },
        ],
        globalSettings: { maxCombo: 8 },
        isLoading: false,
        error: null,
        hasPendingChanges: true,
        reload: jest.fn(),
      } as never);

      const initial = renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );
      const initialEditor = mockUseComboEditor.mock.results.at(-1)?.value;
      initial.unmount();
      mockUseComboEditor.mockReturnValue({
        ...initialEditor,
        modifiedIndices: new Set([0]),
      });

      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );

      const item = screen.getByTestId("combo-list-item-0");
      expect(item).toHaveClass(
        "bg-[var(--color-neon)]/10",
        "border-[var(--color-neon)]/50",
      );
      expect(within(item).getByLabelText("Unsaved")).toBeInTheDocument();
      expect(item).toHaveTextContent("Escape chord");
    });

    it("edits an adjacent combo in a floating behavior selector", async () => {
      const user = userEvent.setup();
      mockUseRuntimeCombo.mockReturnValue({
        isAvailable: true,
        combos: [
          {
            index: 0,
            name: "Escape chord",
            keyPositions: [0, 1],
            behavior: { behaviorId: 1, param1: 0x29, param2: 0 },
            layerMask: 0,
            enabled: true,
            timeoutMs: 0,
            requirePriorIdleMs: 0,
            slowReleaseOverride: 0,
            source: ComboSource.COMBO_SOURCE_DEFAULT,
          },
        ],
        globalSettings: { maxCombo: 8 },
        isLoading: false,
        error: null,
        hasPendingChanges: false,
        reload: jest.fn(),
      } as never);

      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );

      await user.click(
        screen.getByRole("button", { name: /Combo Escape chord:/ }),
      );
      expect(screen.getByTestId("binding-editor-target")).toHaveTextContent(
        "Combo Editor · 0",
      );

      await user.click(screen.getByRole("button", { name: "Floating mode" }));
      const actions = screen.getByTestId("binding-editor-actions");
      expect(
        within(actions).getByRole("button", { name: "Dialog mode" }),
      ).toBeInTheDocument();
      expect(
        within(actions).getByRole("button", {
          name: "Close without applying unfinished edits",
        }),
      ).toBeInTheDocument();

      await user.click(
        within(actions).getByRole("button", { name: "Dialog mode" }),
      );
      expect(
        screen.getByRole("button", { name: "Floating mode" }),
      ).toBeInTheDocument();
      expect(screen.getByTestId("binding-editor-target")).toHaveTextContent(
        "Combo Editor · 0",
      );

      await user.click(
        screen.getByRole("button", { name: "Open Combo Editor" }),
      );
      expect(
        screen.queryByTestId("binding-editor-target"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Combo Editor" }),
      ).toBeInTheDocument();
    });

    it("keeps the combo and key floating editors mutually exclusive", async () => {
      const user = userEvent.setup();
      mockUseRuntimeCombo.mockReturnValue({
        isAvailable: true,
        combos: [
          {
            index: 0,
            name: "Escape chord",
            keyPositions: [0, 1],
            behavior: { behaviorId: 1, param1: 0x29, param2: 0 },
            layerMask: 0,
            enabled: true,
            timeoutMs: 0,
            requirePriorIdleMs: 0,
            slowReleaseOverride: 0,
            source: ComboSource.COMBO_SOURCE_DEFAULT,
          },
        ],
        globalSettings: { maxCombo: 8 },
        isLoading: false,
        error: null,
        hasPendingChanges: false,
        reload: jest.fn(),
      } as never);
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );

      await user.click(
        screen.getAllByRole("button", { name: /Key position \d+:/ })[0],
      );
      await user.click(screen.getByRole("button", { name: "Floating mode" }));
      expect(screen.getByTestId("binding-editor-target")).toHaveTextContent(
        "Base · Key position 0: A",
      );

      await user.click(
        screen.getByRole("button", { name: /Combo Escape chord:/ }),
      );
      expect(screen.getByTestId("binding-editor-target")).toHaveTextContent(
        "Combo Editor · 0",
      );
      expect(
        screen.queryByText("Base · Key position 0: A"),
      ).not.toBeInTheDocument();

      await user.click(
        screen.getAllByRole("button", { name: /Key position \d+:/ })[0],
      );
      expect(screen.getByTestId("binding-editor-target")).toHaveTextContent(
        "Base · Key position 0: A",
      );
      expect(screen.queryByText("Combo Editor · 0")).not.toBeInTheDocument();
    });

    it("lists named combo layers on a separate line in a wrapping card", () => {
      mockUseRuntimeCombo.mockReturnValue({
        isAvailable: true,
        combos: [
          {
            index: 0,
            name: "Three layer chord",
            keyPositions: [0, 1],
            behavior: { behaviorId: 1, param1: 0x29, param2: 0 },
            layerMask: 0x7,
            enabled: true,
            timeoutMs: 0,
            requirePriorIdleMs: 0,
            slowReleaseOverride: 0,
            source: ComboSource.COMBO_SOURCE_DEFAULT,
          },
        ],
        globalSettings: { maxCombo: 8 },
        isLoading: false,
        error: null,
        hasPendingChanges: false,
        reload: jest.fn(),
      } as never);
      renderComponent(
        { isConnected: true },
        {
          keymap: {
            ...mockKeymap,
            layers: [
              ...mockKeymap.layers,
              {
                id: 2,
                name: "Raise",
                bindings: mockKeymap.layers[0].bindings,
              },
            ],
          },
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );

      const item = screen.getByTestId("combo-list-item-0");
      expect(item).toHaveClass("min-w-56", "flex-[1_1_14rem]");
      expect(item).toHaveTextContent("0 + 1");
      expect(item).toHaveTextContent("Layers: Base, Lower, Raise");
      expect(item).not.toHaveTextContent("0x7");
    });

    it("exposes the keymap controls with names and selection state", async () => {
      const user = userEvent.setup();
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
      const layoutTrigger = screen.getByRole("button", {
        name: "Layout and display",
      });
      expect(layoutTrigger).toHaveTextContent("Default");
      expect(layoutTrigger).toHaveTextContent("OS US");
      expect(
        screen.queryByRole("combobox", { name: "OS Layout" }),
      ).not.toBeInTheDocument();
      await user.click(layoutTrigger);
      expect(
        screen.getByRole("combobox", { name: "OS Layout" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("combobox", { name: "Physical Layout" }),
      ).not.toBeInTheDocument();
      await user.keyboard("{Escape}");
      expect(
        screen.queryByRole("dialog", { name: "Layout and display" }),
      ).not.toBeInTheDocument();
      expect(layoutTrigger).toHaveFocus();
      expect(
        screen.getByRole("group", { name: "Keyboard layout for Base" }),
      ).toBeInTheDocument();
      expect(
        screen.getAllByRole("button", { name: /Key position \d+:/ }),
      ).toHaveLength(3);
      expect(screen.getByRole("status")).toHaveTextContent("Saved");
    });

    it("changes both layouts through the grouped dropdown and retains the OS choice after closing", async () => {
      const user = userEvent.setup();
      const setActiveLayout = jest.fn().mockResolvedValue(true);
      const physicalLayouts = {
        ...mockPhysicalLayouts,
        layouts: [
          mockPhysicalLayouts.layouts[0],
          { ...mockPhysicalLayouts.layouts[0], name: "Alternate" },
        ],
      };
      const { replaceKeymap } = renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts,
          behaviors: mockBehaviors,
          setActiveLayout,
        },
      );
      const trigger = screen.getByRole("button", {
        name: "Layout and display",
      });
      await user.click(trigger);
      const dropdown = screen.getByRole("dialog", {
        name: "Layout and display",
      });
      await user.selectOptions(
        within(dropdown).getByLabelText("Physical Layout"),
        "1",
      );
      expect(setActiveLayout).toHaveBeenCalledWith(1);
      replaceKeymap({
        physicalLayouts: { ...physicalLayouts, activeLayoutIndex: 1 },
      });
      expect(trigger).toHaveTextContent("Alternate");
      await user.selectOptions(
        within(dropdown).getByLabelText("OS Layout"),
        "JIS",
      );
      expect(trigger).toHaveTextContent("OS JIS");
      expect(dropdown).toBeInTheDocument();
      await user.keyboard("{Escape}");
      expect(trigger).toHaveFocus();
      await user.click(trigger);
      expect(screen.getByLabelText("OS Layout")).toHaveValue("JIS");
      await user.selectOptions(screen.getByLabelText("OS Layout"), "US");
      expect(mockUseKeymap().setBinding).not.toHaveBeenCalled();
      expect(setActiveLayout).toHaveBeenCalledTimes(1);
      await user.click(screen.getByRole("status"));
      expect(
        screen.queryByRole("dialog", { name: "Layout and display" }),
      ).not.toBeInTheDocument();
    });

    it("uses the preview layout dropdown on every screen size without mobile settings", async () => {
      const user = userEvent.setup();
      const setActiveLayout = jest.fn().mockResolvedValue(true);
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          behaviors: mockBehaviors,
          setActiveLayout,
          physicalLayouts: {
            activeLayoutIndex: 0,
            layouts: [
              mockPhysicalLayouts.layouts[0],
              { ...mockPhysicalLayouts.layouts[0], name: "Alternate" },
            ],
          },
        },
      );
      expect(
        screen.queryByRole("button", { name: "Keymap settings" }),
      ).not.toBeInTheDocument();
      await user.click(
        screen.getByRole("button", { name: "Layout and display" }),
      );
      await user.selectOptions(screen.getByLabelText("Physical Layout"), "1");
      expect(setActiveLayout).toHaveBeenCalledWith(1);
      expect(screen.getByLabelText("OS Layout")).toBeInTheDocument();
    });

    describe("layer rename", () => {
      const openRename = async (
        setLayerName = jest.fn().mockResolvedValue(true),
      ) => {
        const user = userEvent.setup();
        renderComponent(
          { isConnected: true },
          {
            keymap: mockKeymap,
            physicalLayouts: mockPhysicalLayouts,
            behaviors: mockBehaviors,
            setLayerName,
          },
        );
        await user.click(screen.getByRole("button", { name: "Edit layers" }));
        await user.click(
          screen.getByRole("button", { name: "Rename layer Base" }),
        );
        const dialog = screen.getByRole("dialog", { name: "Rename Layer" });
        const input = within(dialog).getByRole("textbox");
        expect(input).toHaveValue("Base");
        await user.clear(input);
        await user.type(input, "Primary");
        return { user, dialog, input, setLayerName };
      };

      it.each(["button", "Enter"])(
        "closes only after successful rename via %s",
        async (method) => {
          const { user, dialog, input, setLayerName } = await openRename();
          if (method === "button")
            await user.click(
              within(dialog).getByRole("button", { name: "Rename" }),
            );
          else await user.type(input, "{Enter}");
          expect(setLayerName).toHaveBeenCalledWith(0, "Primary");
          expect(
            screen.queryByRole("dialog", { name: "Rename Layer" }),
          ).not.toBeInTheDocument();
        },
      );

      it.each(["Cancel", "Escape"])("does not mutate on %s", async (method) => {
        const { user, dialog, input, setLayerName } = await openRename();
        if (method === "Cancel")
          await user.click(
            within(dialog).getByRole("button", { name: "Cancel" }),
          );
        else await user.type(input, "{Escape}");
        expect(setLayerName).not.toHaveBeenCalled();
        expect(
          screen.queryByRole("dialog", { name: "Rename Layer" }),
        ).not.toBeInTheDocument();
        expect(mockKeymap.layers[0].name).toBe("Base");
      });

      it.each(["false", "rejection"])(
        "keeps failed input and permits retry after %s",
        async (failure) => {
          const setLayerName = jest.fn().mockResolvedValue(true);
          if (failure === "false") setLayerName.mockResolvedValueOnce(false);
          else setLayerName.mockRejectedValueOnce(new Error("RPC failed"));
          const { user, dialog, input } = await openRename(setLayerName);
          await user.click(
            within(dialog).getByRole("button", { name: "Rename" }),
          );
          expect(within(dialog).getByRole("alert")).toHaveTextContent(
            "Failed to rename layer. Please try again.",
          );
          expect(input).toHaveValue("Primary");
          expect(
            within(dialog).getByRole("button", { name: "Rename" }),
          ).toBeEnabled();
          await user.type(input, "{Enter}");
          expect(setLayerName).toHaveBeenCalledTimes(2);
          expect(setLayerName).toHaveBeenLastCalledWith(0, "Primary");
          expect(
            screen.queryByRole("dialog", { name: "Rename Layer" }),
          ).not.toBeInTheDocument();
        },
      );

      it("prevents duplicate requests and dismissal during a pending rename", async () => {
        let finish!: (ok: boolean) => void;
        const setLayerName = jest.fn(
          () =>
            new Promise<boolean>((resolve) => {
              finish = resolve;
            }),
        );
        const { user, dialog, input } = await openRename(setLayerName);
        await user.type(input, "{Enter}{Enter}");
        expect(setLayerName).toHaveBeenCalledTimes(1);
        expect(input).toBeDisabled();
        expect(
          within(dialog).getByRole("button", { name: "Rename" }),
        ).toBeDisabled();
        expect(
          within(dialog).getByRole("button", { name: "Cancel" }),
        ).toBeDisabled();
        await user.keyboard("{Escape}");
        expect(dialog).toBeInTheDocument();
        await act(async () => finish(false));
        expect(input).toHaveValue("Primary");
        expect(within(dialog).getByRole("alert")).toBeInTheDocument();
      });

      it("does not send the protocol's empty-name no-op as a successful rename", async () => {
        const { user, dialog, input, setLayerName } = await openRename();
        await user.clear(input);
        expect(
          within(dialog).getByRole("button", { name: "Rename" }),
        ).toBeDisabled();
        await user.type(input, "{Enter}");
        expect(setLayerName).not.toHaveBeenCalled();
        expect(dialog).toBeInTheDocument();
      });
    });

    it("keeps the rename confirmation label visible in layer editing mode", async () => {
      const user = userEvent.setup();
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );

      await user.click(screen.getByRole("button", { name: "Edit layers" }));
      await user.click(
        screen.getByRole("button", { name: "Rename layer Base" }),
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

    it("prompts for unlock before entering layer editing", async () => {
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

      await user.click(screen.getByRole("button", { name: "Edit layers" }));

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
      expect(lowerTab.closest("button")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
  });

  describe("Layer list reconciliation", () => {
    const addedLayer = {
      ...mockKeymap.layers[0],
      id: 7,
      name: "Added",
    };
    const expandedKeymap = {
      ...mockKeymap,
      layers: [...mockKeymap.layers, addedLayer],
    };

    beforeEach(() => {
      jest.mocked(useRuntimeSensorRotate).mockReturnValue({
        ...jest.mocked(useRuntimeSensorRotate)(),
        isAvailable: true,
        sensors: [{ index: 0, name: "Encoder" }],
      });
    });

    const expectSelectedPreview = (name: string, id: number) => {
      expect(screen.getByRole("button", { name, exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(document.querySelector(".keymap-preview")).toBeInTheDocument();
      expect(screen.getByText("Saved")).toBeInTheDocument();
      expect(
        screen.getByRole("group", {
          name: `Encoder · Sensor 0 · Layer ${id}: ${name}`,
        }),
      ).toBeInTheDocument();
    };

    it("reconciles the selected added layer after confirmed Discard replaces the list", async () => {
      const user = userEvent.setup();
      const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
      const discardChanges = jest.fn(async () => {
        replaceKeymap({ keymap: mockKeymap, hasUnsavedChanges: false });
        return true;
      });
      const addLayer = jest.fn(async () => {
        replaceKeymap({ keymap: expandedKeymap, hasUnsavedChanges: true });
        return { index: 2, layer: addedLayer };
      });
      const { replaceKeymap } = renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
          addLayer,
          discardChanges,
        },
      );
      try {
        await user.click(screen.getByRole("button", { name: "Edit layers" }));
        await user.click(screen.getByRole("button", { name: "Add new layer" }));
        expect(
          screen.getByRole("button", { name: "Added", exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
        await openResetMenu(user);
        await user.click(screen.getByText("Discard").closest("button")!);
        expect(discardChanges).not.toHaveBeenCalled();
        expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
        confirm.mockReturnValue(true);
        await openResetMenu(user);
        await user.click(screen.getByText("Discard").closest("button")!);
        expect(discardChanges).toHaveBeenCalledTimes(1);
        expect(
          screen.queryByRole("button", { name: "Added", exact: true }),
        ).not.toBeInTheDocument();
        expectSelectedPreview("Lower", 1);
        expect(
          screen.getByRole("button", { name: "Save", exact: true }),
        ).toBeDisabled();
        expect(
          screen.getByRole("button", { name: "Reorder layer Lower" }),
        ).toBeEnabled();
        expect(
          screen.getByRole("button", { name: "Rename layer Lower" }),
        ).toBeEnabled();
        expect(
          screen.getByRole("button", { name: "Delete layer Lower" }),
        ).toBeEnabled();
      } finally {
        confirm.mockRestore();
      }
    });

    it("restores a valid selection through real framed Demo Add, Discard and Reload RPCs", async () => {
      const user = userEvent.setup();
      const transport = await connectDemo();
      // Normalize protobuf's Node Buffer into the jsdom Uint8Array realm before
      // framing, just as the Demo transport wire tests do.
      const requests = new TransformStream({
        transform(request, controller) {
          controller.enqueue(Uint8Array.from(Request.encode(request).finish()));
        },
      });
      const pipeline = requests.readable
        .pipeThrough(new TransformStream(get_encoder()))
        .pipeTo(transport.writable)
        .catch(() => {});
      const connection = {
        label: transport.label,
        current_request: 0,
        request_writable: requests.writable,
        request_response_readable: transport.readable
          .pipeThrough(new TransformStream(get_decoder()))
          .pipeThrough(
            new TransformStream({
              transform(bytes, controller) {
                const response = Response.decode(bytes);
                if (response.requestResponse)
                  controller.enqueue(response.requestResponse);
              },
            }),
          ),
        notification_readable: new ReadableStream(),
      };
      const app = createConnectedMockZMKApp();
      app.state.connection = connection;
      mockUseKeymap.mockImplementation(
        jest.requireActual("../../hooks/useKeymap").useKeymap,
      );
      const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
      const page = render(
        <ConnectionContext.Provider
          value={{ ...mockConnectionContext, isConnected: true }}
        >
          <ZMKAppProvider value={app}>
            <StudioUnlockProvider>
              <KeymapPage />
            </StudioUnlockProvider>
          </ZMKAppProvider>
        </ConnectionContext.Provider>,
      );
      try {
        await screen.findByText("Saved");
        await user.click(screen.getByRole("button", { name: "Edit layers" }));
        await user.click(screen.getByRole("button", { name: "Add new layer" }));
        await waitFor(() =>
          expect(
            screen.getByRole("button", { name: "Layer 3", exact: true }),
          ).toHaveAttribute("aria-pressed", "true"),
        );
        expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
        await openResetMenu(user);
        await user.click(screen.getByText("Discard").closest("button")!);
        await waitFor(() =>
          expect(
            screen.queryByRole("button", { name: "Layer 3", exact: true }),
          ).not.toBeInTheDocument(),
        );
        expectSelectedPreview("Raise", 2);
        expect(
          screen.getByRole("group", { name: "Keyboard layout for Raise" }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Save", exact: true }),
        ).toBeDisabled();
        await user.click(
          screen.getByRole("button", { name: "Reload", exact: true }),
        );
        await waitFor(() =>
          expect(
            screen.getByRole("button", { name: "Reload", exact: true }),
          ).toBeEnabled(),
        );
        expectSelectedPreview("Raise", 2);
      } finally {
        page.unmount();
        confirm.mockRestore();
        await requests.writable.close();
        await pipeline;
        await connection.request_response_readable.cancel();
        transport.abortController.abort();
      }
    });

    it("reconciles a shorter Reload response and closes the old binding editor", async () => {
      const user = userEvent.setup();
      localStorage.setItem("keymapSelectorMode", "floating");
      const loadKeymapData = jest.fn(async () => {
        replaceKeymap({ keymap: mockKeymap });
      });
      const { replaceKeymap } = renderComponent(
        { isConnected: true },
        {
          keymap: expandedKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
          loadKeymapData,
        },
      );
      await user.click(
        screen.getByRole("button", { name: "Added", exact: true }),
      );
      await user.click(
        screen.getByRole("button", { name: "Key position 0: A" }),
      );
      expect(screen.getByText("Select Key Binding")).toBeInTheDocument();
      await user.click(
        screen.getByRole("button", { name: "Reload", exact: true }),
      );
      expect(loadKeymapData).toHaveBeenCalledTimes(1);
      expectSelectedPreview("Lower", 1);
      expect(screen.queryByText("Select Key Binding")).not.toBeInTheDocument();
    });

    it("preserves an in-range selection when the layer list is replaced or grows", async () => {
      const user = userEvent.setup();
      const { replaceKeymap } = renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );
      await user.click(
        screen.getByRole("button", { name: "Lower", exact: true }),
      );
      replaceKeymap({
        keymap: { ...mockKeymap, layers: [...mockKeymap.layers] },
      });
      expectSelectedPreview("Lower", 1);
      replaceKeymap({ keymap: expandedKeymap });
      expectSelectedPreview("Lower", 1);
    });

    it("disables current-layer actions for an empty list and recovers when layers return", async () => {
      const user = userEvent.setup();
      const { replaceKeymap } = renderComponent(
        { isConnected: true },
        {
          keymap: expandedKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );
      await user.click(
        screen.getByRole("button", { name: "Added", exact: true }),
      );
      replaceKeymap({ keymap: { ...mockKeymap, layers: [] } });
      expect(document.querySelector(".keymap-preview")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Rotary Encoder Configuration"),
      ).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Edit layers" }));
      expect(
        screen.queryByRole("button", { name: /Rename layer/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Delete layer/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Add new layer" }),
      ).toBeEnabled();
      await act(async () => {
        replaceKeymap({ keymap: expandedKeymap });
      });
      expectSelectedPreview("Base", 0);
    });
  });

  describe("Layer editing", () => {
    it("hides management controls until editing, freezes tab selection, and resumes on finish", async () => {
      const user = userEvent.setup();
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
        },
      );
      expect(screen.getByText("Layer", { exact: true })).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Add new layer" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Rename layer Lower" }),
      ).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Edit layers" }));
      const lower = screen.getByRole("button", { name: "Lower", exact: true });
      await user.click(lower);
      expect(lower).toHaveAttribute("aria-pressed", "false");
      expect(
        screen.getByRole("group", { name: "Keyboard layout for Base" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Rename layer Lower" }),
      ).toBeInTheDocument();
      await user.click(
        screen.getByRole("button", { name: "Finish layer editing" }),
      );
      const normalLower = screen.getByRole("button", {
        name: "Lower",
        exact: true,
      });
      await user.click(normalLower);
      expect(normalLower).toHaveAttribute("aria-pressed", "true");
    });

    it("reorders using arrow keys and preserves the preview layer identity", async () => {
      const user = userEvent.setup();
      const moveLayer = jest.fn(async () => {
        replaceKeymap({
          keymap: { ...mockKeymap, layers: [...mockKeymap.layers].reverse() },
        });
        return true;
      });
      const { replaceKeymap } = renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
          moveLayer,
        },
      );
      await user.click(screen.getByRole("button", { name: "Edit layers" }));
      screen.getByRole("button", { name: "Reorder layer Lower" }).focus();
      await user.keyboard("{ArrowRight}");
      expect(moveLayer).not.toHaveBeenCalled();
      await user.keyboard("{ArrowLeft}");
      expect(moveLayer).toHaveBeenCalledWith(1, 0);
      expect(
        screen.getByRole("button", { name: "Base", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        screen.getByRole("group", { name: "Keyboard layout for Base" }),
      ).toBeInTheDocument();
    });

    it("blocks duplicate moves while pending and keeps selection on a failed move", async () => {
      const user = userEvent.setup();
      let finish!: (result: boolean) => void;
      const moveLayer = jest.fn(
        () =>
          new Promise<boolean>((resolve) => {
            finish = resolve;
          }),
      );
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
          moveLayer,
        },
      );
      await user.click(screen.getByRole("button", { name: "Edit layers" }));
      const handle = screen.getByRole("button", { name: "Reorder layer Base" });
      handle.focus();
      await user.keyboard("{ArrowRight}{ArrowRight}");
      expect(moveLayer).toHaveBeenCalledTimes(1);
      expect(
        screen.getByRole("button", { name: "Add new layer" }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Finish layer editing" }),
      ).toBeDisabled();
      await act(async () => finish(false));
      expect(handle).toBeEnabled();
      expect(
        screen.getByRole("button", { name: "Base", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
    });

    it.each([0, 1])(
      "reconciles preview after deleting index %s while the last layer is selected",
      async (index) => {
        const user = userEvent.setup();
        const removeLayer = jest.fn(async () => {
          replaceKeymap({
            keymap: {
              ...mockKeymap,
              layers: mockKeymap.layers.filter((_, i) => i !== index),
            },
          });
          return true;
        });
        const { replaceKeymap } = renderComponent(
          { isConnected: true },
          {
            keymap: mockKeymap,
            physicalLayouts: mockPhysicalLayouts,
            behaviors: mockBehaviors,
            removeLayer,
          },
        );
        const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
        try {
          await user.click(
            screen.getByRole("button", { name: "Lower", exact: true }),
          );
          await user.click(screen.getByRole("button", { name: "Edit layers" }));
          await user.click(
            screen.getByRole("button", {
              name: `Delete layer ${index === 0 ? "Base" : "Lower"}`,
            }),
          );
          expect(removeLayer).toHaveBeenCalledWith(index);
          expect(
            screen.getByRole("button", {
              name: index === 0 ? "Lower" : "Base",
              exact: true,
            }),
          ).toHaveAttribute("aria-pressed", "true");
          expect(
            screen.getByRole("button", { name: /Delete layer/ }),
          ).toBeDisabled();
        } finally {
          confirm.mockRestore();
        }
      },
    );

    it("renames and deletes the item acted on without selecting it", async () => {
      const user = userEvent.setup();
      const setLayerName = jest.fn().mockResolvedValue(true);
      const removeLayer = jest.fn().mockResolvedValue(true);
      const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
          setLayerName,
          removeLayer,
        },
      );
      try {
        await user.click(screen.getByRole("button", { name: "Edit layers" }));
        await user.click(
          screen.getByRole("button", { name: "Rename layer Lower" }),
        );
        const dialog = screen.getByRole("dialog", { name: "Rename Layer" });
        await user.clear(within(dialog).getByRole("textbox"));
        await user.type(within(dialog).getByRole("textbox"), "Utility");
        await user.click(
          within(dialog).getByRole("button", { name: "Rename", exact: true }),
        );
        expect(setLayerName).toHaveBeenCalledWith(1, "Utility");
        await user.click(
          screen.getByRole("button", { name: "Delete layer Lower" }),
        );
        expect(removeLayer).toHaveBeenCalledWith(1);
        expect(
          screen.getByRole("button", { name: "Base", exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
      } finally {
        confirm.mockRestore();
      }
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
      await user.click(screen.getByRole("button", { name: "Edit layers" }));
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

      await user.click(screen.getByRole("button", { name: "Edit layers" }));
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

    it("disables the restore button when there are no deleted layers", async () => {
      const user = userEvent.setup();
      renderComponent(
        { isConnected: true },
        {
          keymap: mockKeymap,
          physicalLayouts: mockPhysicalLayouts,
          behaviors: mockBehaviors,
          removedLayerIds: [],
        },
      );

      await user.click(screen.getByRole("button", { name: "Edit layers" }));
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
