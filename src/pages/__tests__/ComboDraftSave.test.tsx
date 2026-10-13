import { useState } from "react";
import { act, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ZMKAppProvider,
  createConnectedMockZMKApp,
} from "@cormoran/zmk-studio-react-hook/testing";
import { ConnectionContext } from "../../contexts/DeviceConnectionContext";
import { StudioUnlockProvider } from "../../contexts/StudioUnlockContext";
import { MacroComboPage } from "../MacroComboPage";
import { KeymapPage } from "../KeymapPage";
import {
  useRuntimeCombo,
  type Combo,
  type UseRuntimeComboReturn,
} from "../../hooks/useRuntimeCombo";
import { useKeymap, type UseKeymapReturn } from "../../hooks/useKeymap";
import { useRuntimeMacro } from "../../hooks/useRuntimeMacro";
import { useMacroEditor } from "../../components/macroCombo/useMacroEditor";
import { useVersionHistory } from "../../hooks/useVersionHistory";
import { useMacroComboVersionHistory } from "../../hooks/versionHistory/useMacroComboVersionHistory";
import { createIdleVersionHistory } from "../testUtils/versionHistory";
import {
  ComboSource,
  SlowReleaseOverride,
} from "../../proto/cormoran/runtime_combo/runtime_combo";

jest.mock("../../hooks/useRuntimeCombo", () => ({
  ...jest.requireActual("../../hooks/useRuntimeCombo"),
  useRuntimeCombo: jest.fn(),
}));
jest.mock("../../hooks/useKeymap", () => ({
  ...jest.requireActual("../../hooks/useKeymap"),
  useKeymap: jest.fn(),
}));
jest.mock("../../hooks/useRuntimeMacro");
jest.mock("../../components/macroCombo/MacroEditorDialog", () => ({
  MacroEditorDialog: () => null,
}));
jest.mock("@cormoran/zmk-studio-react-hook", () => ({
  ...jest.requireActual("@cormoran/zmk-studio-react-hook"),
  useStudioLockState: () => ({ locked: false, lockState: "unlocked" }),
}));
jest.mock("../../components/macroCombo/useMacroEditor");
jest.mock("../../hooks/useVersionHistory");
jest.mock("../../hooks/versionHistory/useMacroComboVersionHistory");

const positions = (count: number) => Array.from({ length: count }, (_, i) => i);
const cloneCombo = (combo: Combo): Combo => ({
  ...combo,
  keyPositions: [...combo.keyPositions],
  behavior: { ...combo.behavior! },
});
const initialCombo: Combo = {
  index: 0,
  name: "Boundary chord",
  keyPositions: positions(16),
  behavior: { behaviorId: 1, param1: 0x70004, param2: 0 },
  layerMask: 0,
  enabled: true,
  timeoutMs: 0,
  requirePriorIdleMs: 0,
  slowReleaseOverride: SlowReleaseOverride.SLOW_RELEASE_OVERRIDE_INHERIT,
  source: ComboSource.COMBO_SOURCE_RUNTIME,
};

// Real shared controller/card and page Save consumers; emulate the independent
// RAM/flash boundary so Refresh and reselection read back saved positions.
describe.each([MacroComboPage, KeymapPage])(
  "%p selected combo draft Save",
  (Page) => {
    let ram: Combo;
    let saved: Combo;
    let runtime: UseRuntimeComboReturn;
    let keymap: UseKeymapReturn;
    let macroSave: jest.Mock;
    let capture: jest.Mock;
    let setCombo: jest.Mock;
    let saveCombo: jest.Mock;
    let refresh: jest.Mock;
    let publish: (dirty: boolean) => void;

    beforeEach(() => {
      jest.clearAllMocks();
      localStorage.clear();
      ram = cloneCombo(initialCombo);
      saved = cloneCombo(initialCombo);
      macroSave = jest.fn().mockResolvedValue(true);
      capture = jest.fn();
      setCombo = jest.fn(async (input) => {
        ram = { ...ram, ...input };
        publish(true);
        return true;
      });
      saveCombo = jest.fn(async () => {
        saved = cloneCombo(ram);
        publish(false);
        return { affectedCount: 1 };
      });
      refresh = jest.fn(async () => {
        publish(runtime.hasPendingChanges);
      });
      jest
        .mocked(useRuntimeCombo)
        .mockImplementation(function useMockRuntimeCombo() {
          const [, update] = useState(false);
          const [dirty, setDirty] = useState(false);
          publish = (next) => {
            setDirty(next);
            update((value) => !value);
          };
          runtime = {
            isAvailable: true,
            combos: [ram],
            globalSettings: {
              maxCombo: 16,
              timeoutMs: 50,
              slowRelease: false,
              requirePriorIdleMs: 0,
            },
            isLoading: false,
            error: null,
            hasPendingChanges: dirty,
            setCombo,
            setComboName: jest.fn(async (_index, name) => {
              ram = { ...ram, name };
              publish(true);
              return true;
            }),
            saveChanges: saveCombo,
            discardChanges: jest.fn(async () => {
              ram = cloneCombo(saved);
              publish(false);
              return { affectedCount: 1 };
            }),
            reload: refresh,
            loadCombos: jest.fn(),
            loadGlobalSettings: jest.fn(),
            clearError: jest.fn(),
          } as unknown as UseRuntimeComboReturn;
          return runtime;
        });
      const bindings = positions(17).map(() => initialCombo.behavior);
      keymap = {
        keymap: { layers: [{ id: 0, name: "Base", bindings }] },
        physicalLayouts: {
          activeLayoutIndex: 0,
          layouts: [
            {
              name: "Test",
              keys: positions(17).map((i) => ({
                width: 100,
                height: 100,
                x: i * 100,
                y: 0,
                r: 0,
                rx: 0,
                ry: 0,
              })),
            },
          ],
        },
        behaviors: new Map([
          [1, { id: 1, displayName: "Key Press", metadata: [] }],
        ]),
        originalBindings: new Map(),
        isFullyLoaded: true,
        isLoading: false,
        hasUnsavedChanges: false,
        removedLayerIds: [],
        error: null,
        loadKeymapData: jest.fn(),
        saveChanges: jest.fn().mockResolvedValue(true),
        getOriginalBinding: () => null,
        getDefaultBinding: () => null,
        isBindingModified: () => false,
        isBindingChangedFromDefault: () => false,
      } as unknown as UseKeymapReturn;
      jest.mocked(useKeymap).mockReturnValue(keymap);
      jest.mocked(useRuntimeMacro).mockReturnValue({
        isAvailable: true,
        macros: [],
        globalSettings: null,
        hasUnsavedChanges: true,
        isLoading: false,
        saveMacros: macroSave,
        discardMacros: jest.fn(),
        loadMacros: jest.fn(),
        clearError: jest.fn(),
      } as never);
      jest.mocked(useMacroEditor).mockReturnValue({
        selectedSlot: null,
        globalModifiedFields: new Set(),
        flushPendingWrites: jest.fn().mockResolvedValue(true),
        cancelPendingWrites: jest.fn(),
        reloadLoadedMacro: jest.fn(),
        clearGlobalModified: jest.fn(),
        clearSelection: jest.fn(),
      } as never);
      const history = { ...createIdleVersionHistory(), capture };
      jest.mocked(useVersionHistory).mockReturnValue(history);
      jest
        .mocked(useMacroComboVersionHistory)
        .mockReturnValue(history as never);
    });

    function mount() {
      return render(
        <ConnectionContext.Provider
          value={{
            isConnected: true,
            isLoading: false,
            onConnect: jest.fn(),
            onDisconnect: jest.fn(),
            error: null,
          }}
        >
          <ZMKAppProvider value={createConnectedMockZMKApp()}>
            <StudioUnlockProvider>
              <Page />
            </StudioUnlockProvider>
          </ZMKAppProvider>
        </ConnectionContext.Provider>,
      );
    }

    async function open(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("button", { name: /Boundary.*chord/ }));
      return Page === KeymapPage
        ? within(screen.getByRole("dialog", { name: "Combo Editor" }))
        : screen;
    }

    it("allows unrelated Save with no selected combo despite its empty default draft", async () => {
      keymap.hasUnsavedChanges = true;
      const user = userEvent.setup();
      mount();
      expect(
        screen.getByRole("button", { name: "Save", exact: true }),
      ).toBeEnabled();
      await user.click(
        screen.getByRole("button", { name: "Save", exact: true }),
      );
      expect(
        Page === KeymapPage ? keymap.saveChanges : macroSave,
      ).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByText(/has not been applied or saved/),
      ).not.toBeInTheDocument();
    });

    it("cannot persist an unrelated edit while a retained 17-position draft is invalid", async () => {
      keymap.hasUnsavedChanges = true;
      const user = userEvent.setup();
      mount();
      const editor = await open(user);
      await user.click(
        editor.getByRole("button", { name: /Key position 16:/ }),
      );
      if (Page === KeymapPage) await user.keyboard("{Escape}");
      const save = screen.getByRole("button", { name: "Save", exact: true });
      expect(save).toBeDisabled();
      await user.click(save);
      expect(saveCombo).not.toHaveBeenCalled();
      expect(macroSave).not.toHaveBeenCalled();
      expect(keymap.saveChanges).not.toHaveBeenCalled();
      expect(setCombo).not.toHaveBeenCalled();
      expect(saved.keyPositions).toEqual(positions(16));
    });

    it("blocks 17 positions after a valid RAM edit, retains the error after closing, then saves and reads back 16", async () => {
      const user = userEvent.setup();
      mount();
      const editor = await open(user);
      // Make a genuine pending 16-position RAM edit before the invalid draft.
      await user.clear(editor.getByLabelText("Name"));
      await user.type(editor.getByLabelText("Name"), "Boundary updated chord");
      await user.click(
        editor.getByRole("button", { name: /Key position 15:/ }),
      );
      await user.click(
        editor.getByRole("button", { name: /Key position 15:/ }),
      );
      expect(ram.keyPositions).toEqual(positions(16));
      await user.click(
        editor.getByRole("button", { name: /Key position 16:/ }),
      );
      expect(editor.getByLabelText("Positions")).toHaveValue(
        positions(17).join(", "),
      );
      if (Page === MacroComboPage)
        expect(
          screen.getByRole("button", { name: "Save", exact: true }),
        ).toBeDisabled();
      expect(editor.getByRole("alert")).toHaveTextContent(
        "Select 16 positions or fewer.",
      );
      expect(editor.getByRole("alert")).toHaveTextContent(
        "This combo draft has not been applied or saved. Fix it before saving.",
      );
      expect(
        setCombo.mock.calls.every(([input]) => input.keyPositions.length <= 16),
      ).toBe(true);
      if (Page === KeymapPage) await user.keyboard("{Escape}");
      const save = screen.getByRole("button", { name: "Save", exact: true });
      expect(save).toBeDisabled();
      expect(screen.getByRole("alert")).toHaveTextContent(
        "has not been applied or saved",
      );
      await user.click(save);
      expect(saveCombo).not.toHaveBeenCalled();
      expect(macroSave).not.toHaveBeenCalled();
      expect(keymap.saveChanges).not.toHaveBeenCalled();
      expect(capture).not.toHaveBeenCalled();
      expect(
        screen.queryByText(/Saved 1 runtime combo changes/),
      ).not.toBeInTheDocument();
      if (Page === KeymapPage) {
        // Opening the same slot explicitly reloads its RAM value and abandons
        // the local invalid input, as it did before this focused fix.
        await open(user);
      } else {
        await user.click(
          editor.getByRole("button", { name: /Key position 16:/ }),
        );
      }
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      if (Page === KeymapPage) await user.keyboard("{Escape}");
      await user.click(
        screen.getByRole("button", { name: "Save", exact: true }),
      );
      expect(saveCombo).toHaveBeenCalledTimes(1);
      expect(saved.keyPositions).toEqual(positions(16));
      expect(saved.name).toBe("Boundary updated chord");
      await act(async () => runtime.reload());
      const readback = await open(user);
      expect(readback.getByLabelText("Positions")).toHaveValue(
        positions(16).join(", "),
      );
      expect(readback.getByLabelText("Name")).toHaveValue(
        "Boundary updated chord",
      );
    });

    it("abandons the invalid draft on Discard and permits unrelated Save again", async () => {
      const confirmation = jest.spyOn(window, "confirm").mockReturnValue(true);
      const user = userEvent.setup();
      mount();
      const editor = await open(user);
      await user.click(
        editor.getByRole("button", { name: /Key position 15:/ }),
      );
      await user.click(
        editor.getByRole("button", { name: /Key position 15:/ }),
      );
      await user.click(
        editor.getByRole("button", { name: /Key position 16:/ }),
      );
      if (Page === KeymapPage) await user.keyboard("{Escape}");
      await user.click(screen.getByRole("button", { name: /Reset/ }));
      await user.click(screen.getByRole("menuitem", { name: /^Discard/ }));
      await waitFor(() =>
        expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
      );
      expect(ram).toEqual(saved);
      keymap.hasUnsavedChanges = true;
      await act(async () => publish(false));
      expect(
        screen.getByRole("button", { name: "Save", exact: true }),
      ).toBeEnabled();
      await user.click(
        screen.getByRole("button", { name: "Save", exact: true }),
      );
      expect(
        Page === KeymapPage ? keymap.saveChanges : macroSave,
      ).toHaveBeenCalledTimes(1);
      confirmation.mockRestore();
    });
  },
);
