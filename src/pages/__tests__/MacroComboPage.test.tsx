import { serialize, deserialize } from "node:v8";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MacroComboPage } from "../MacroComboPage";
import { ConnectionContext } from "../../contexts/DeviceConnectionContext";
import {
  Request,
  MacroDetail,
} from "../../proto/cormoran/runtime_macro/runtime_macro";
import {
  stringToKeyTapSequenceStep,
  getKeyTapSequenceString,
} from "../../components/macroCombo/macroStepUtils";

const mockTapDance = {
  isAvailable: false,
  entries: [] as Array<
    import("../../proto/cormoran/runtime_tapdance/runtime_tapdance").State
  >,
  globalSettings: null as
    | import("../../proto/cormoran/runtime_tapdance/runtime_tapdance").GlobalResponse
    | null,
  hasUnsavedChanges: false,
  intervalMs: 200,
  revision: 0,
  busy: false,
  error: null,
  load: jest.fn(),
  create: jest.fn(),
  rename: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  saveInterval: jest.fn(),
  saveChanges: jest.fn(),
  discardChanges: jest.fn(),
};
let mockKeymapModel: import("../../hooks/useKeymap").Keymap | null = null;
jest.mock("../../hooks/useRuntimeTapDance", () => ({
  useRuntimeTapDance: () => mockTapDance,
}));
const mockCall = jest.fn();
const mockReloadKeymap = jest.fn();
let mockTabActive = true;
jest.mock("../../hooks/useIsTabActive", () => ({
  useIsTabActive: () => mockTabActive,
}));
const mockUnlock = jest.fn(() => true);
const mockCapture = jest.fn();
let mockMacroAvailable = true;
const mockCombo = {
  isAvailable: false,
  isLoading: false,
  hasPendingChanges: false,
  globalSettings: null,
  combos: [],
  error: null as string | null,
  saveChanges: jest.fn(),
  reload: jest.fn(),
};
jest.mock("../../hooks/useCustomSubsystem", () => ({
  useCustomSubsystem: (identifier: string) => ({
    subsystem:
      mockMacroAvailable && identifier === "cormoran__runtime_macro"
        ? { index: 0 }
        : null,
    ready: mockMacroAvailable && identifier === "cormoran__runtime_macro",
    call: mockCall,
  }),
}));
jest.mock("../../hooks/useStudioUnlock", () => ({
  useStudioUnlock: () => ({ requireUnlock: mockUnlock }),
}));
jest.mock("@cormoran/zmk-studio-react-hook", () => ({
  ...jest.requireActual("@cormoran/zmk-studio-react-hook"),
  useStudioLockState: () => ({ locked: false }),
}));
jest.mock("../../hooks/useKeymap", () => ({
  useKeymap: () => ({
    behaviors: new Map(),
    keymap: mockKeymapModel,
    isFullyLoaded: mockKeymapModel !== null,
    loadKeymapData: mockReloadKeymap,
  }),
}));
jest.mock("../../hooks/useRuntimeCombo", () => ({
  useRuntimeCombo: () => mockCombo,
}));
jest.mock("../../hooks/versionHistory/useMacroComboVersionHistory", () => ({
  useMacroComboVersionHistory: () => ({ versions: [], capture: mockCapture }),
}));
jest.mock("../../components/versionHistory/VersionDiffModal", () => ({
  VersionDiffModal: () => null,
}));

function clone<T>(value: T): T {
  return deserialize(serialize(value));
}

let ram: MacroDetail[];
let flash: MacroDetail[];
let finishWrite: (() => void) | undefined;
let failWrite: boolean;
let failSave: boolean;
let deferWrites: boolean;

beforeEach(() => {
  jest.clearAllMocks();
  mockTabActive = true;
  mockTapDance.isAvailable = false;
  mockTapDance.entries = [];
  mockTapDance.globalSettings = null;
  mockTapDance.hasUnsavedChanges = false;
  mockKeymapModel = null;
  mockTapDance.saveChanges.mockResolvedValue(true);
  mockTapDance.discardChanges.mockResolvedValue(true);
  mockUnlock.mockReturnValue(true);
  mockMacroAvailable = true;
  mockCombo.isLoading = false;
  mockCombo.isAvailable = false;
  mockCombo.hasPendingChanges = false;
  mockCombo.error = null;
  mockCombo.saveChanges.mockImplementation(async () => {
    mockCombo.hasPendingChanges = false;
    return { affectedCount: 3 };
  });
  ram = [
    MacroDetail.create({
      slot: 0,
      name: "Existing",
      steps: [stringToKeyTapSequenceStep("aa")!],
    }),
  ];
  flash = clone(ram);
  finishWrite = undefined;
  failWrite = false;
  failSave = false;
  deferWrites = true;
  mockCall.mockImplementation(async (req: Request) => {
    if (req.listMacros)
      return {
        listMacros: {
          macros: ram.map((m) => ({
            slot: m.slot,
            name: m.name,
            hasUnsavedChanges: JSON.stringify(ram) !== JSON.stringify(flash),
          })),
          maxMacroBytes: 256,
          maxNameLength: 64,
        },
      };
    if (req.getMacroGlobalSettings)
      return { getMacroGlobalSettings: { settings: { tapMs: 30 } } };
    if (req.getMacro)
      return {
        getMacro: {
          macro: clone(ram.find((m) => m.slot === req.getMacro!.slot)),
        },
      };
    if (req.createMacro)
      ram.push(MacroDetail.create({ slot: 1, name: req.createMacro.name }));
    if (req.setMacroStepCount) {
      if (deferWrites)
        await new Promise<void>((resolve) => {
          finishWrite = resolve;
        });
      if (failWrite) return { error: { message: "RAM write failed" } };
    }
    if (req.setMacroStep)
      ram.find((m) => m.slot === req.setMacroStep!.slot)!.steps[
        req.setMacroStep.stepIndex
      ] = clone(req.setMacroStep.step!);
    if (req.saveMacros) {
      if (failSave) return { error: { message: "Flash save failed" } };
      flash = clone(ram);
    }
    if (req.discardMacros) ram = clone(flash);
    return { status: { affectedCount: 1 } };
  });
});

async function openPage() {
  const user = userEvent.setup();
  render(
    <ConnectionContext.Provider
      value={{
        isConnected: true,
        deviceName: "Test",
        onConnect: () => {},
        onDisconnect: () => {},
        isLoading: false,
        error: null,
        isReconnecting: false,
        onCancelReconnect: () => {},
      }}
    >
      <MacroComboPage />
    </ConnectionContext.Provider>,
  );
  if (mockMacroAvailable) await screen.findByDisplayValue("aa");
  return user;
}
async function completeWrite() {
  await waitFor(() => expect(finishWrite).toBeDefined());
  await act(async () => finishWrite!());
}
function saveCalls() {
  return mockCall.mock.calls.filter(([req]) => req.saveMacros);
}

it("accepts the first direct Save after typing, waits for RAM, prevents duplicate saves, and preserves the string after Refresh/reselection and Discard", async () => {
  const user = await openPage();
  await user.clear(screen.getByDisplayValue("aa"));
  await user.type(screen.getAllByRole("textbox")[1], "immediate");
  const save = screen.getByRole("button", { name: "Save" });
  expect(save).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(saveCalls()).toHaveLength(0);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  await completeWrite();
  await waitFor(() => expect(saveCalls()).toHaveLength(1));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled(),
  );
  expect(getKeyTapSequenceString(flash[0].steps[0])).toBe("immediate");
  expect(screen.getByRole("status")).toHaveTextContent(
    "Saved runtime macro changes.",
  );
  expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Refresh" }));
  await user.click(screen.getByRole("button", { name: "Existing" }));
  expect(await screen.findByDisplayValue("immediate")).toBeInTheDocument();
  await user.clear(screen.getByDisplayValue("immediate"));
  await user.type(screen.getAllByRole("textbox")[1], "discarded");

  const reset = screen.getByRole("button", { name: "Reset", expanded: false });
  await user.click(reset);
  await completeWrite();
  if (!screen.queryByRole("menuitem", { name: /Discard/ }))
    await user.click(
      screen.getByRole("button", { name: "Reset", expanded: false }),
    );
  await user.click(screen.getByRole("menuitem", { name: /Discard/ }));
  expect(await screen.findByDisplayValue("immediate")).toBeInTheDocument();
});

it.each(["RAM", "flash"])(
  "does not report success or capture a version after a failed %s write",
  async (kind) => {
    const user = await openPage();
    failWrite = kind === "RAM";
    failSave = kind === "flash";
    await user.clear(screen.getByDisplayValue("aa"));
    await user.type(screen.getAllByRole("textbox")[1], "latest");
    mockCapture.mockClear();
    await user.click(screen.getByRole("button", { name: "Save" }));
    await completeWrite();
    await screen.findByText(
      kind === "RAM" ? "RAM write failed" : "Flash save failed",
    );
    expect(getKeyTapSequenceString(flash[0].steps[0])).toBe("aa");
    expect(mockCapture).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(saveCalls()).toHaveLength(kind === "RAM" ? 0 : 1);
    if (kind === "RAM") {
      // A later click alone must not persist the stale RAM value.
      await user.click(screen.getByRole("button", { name: "Save" }));
      expect(saveCalls()).toHaveLength(0);
      failWrite = false;
      finishWrite = undefined;
      await user.clear(screen.getByDisplayValue("latest"));
      await user.type(screen.getAllByRole("textbox")[1], "recovered");
      await user.click(screen.getByRole("button", { name: "Save" }));
      await completeWrite();
      await waitFor(() => expect(saveCalls()).toHaveLength(1));
      expect(getKeyTapSequenceString(flash[0].steps[0])).toBe("recovered");
    }
  },
);

it("keeps the unlock gate", async () => {
  const user = await openPage();
  await user.clear(screen.getByDisplayValue("aa"));
  await user.type(screen.getAllByRole("textbox")[1], "latest");
  mockUnlock.mockReturnValue(false);
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(saveCalls()).toHaveLength(0);
  expect(finishWrite).toBeUndefined();
});

it("persists a newly created macro and its latest string on the first Save", async () => {
  const user = await openPage();
  deferWrites = false;
  await user.click(screen.getByTitle("Create macro"));
  await screen.findByDisplayValue("Macro 2");
  await user.click(screen.getByRole("button", { name: "Step" }));
  await screen.findByRole("spinbutton");
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Step" })).toBeEnabled(),
  );
  await user.selectOptions(screen.getByRole("combobox"), "string");
  await screen.findByDisplayValue("aa");
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Step" })).toBeEnabled(),
  );
  deferWrites = true;
  await user.clear(screen.getByDisplayValue("aa"));
  await user.type(screen.getAllByRole("textbox")[1], "immediate");
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "Save" }));
  await completeWrite();
  await waitFor(() => expect(saveCalls()).toHaveLength(1));
  await waitFor(() =>
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument(),
  );
  expect(flash.map((m) => m.name)).toEqual(["Existing", "Macro 2"]);
  expect(getKeyTapSequenceString(flash[1].steps[0])).toBe("immediate");
  await user.click(screen.getByRole("button", { name: "Refresh" }));
  await user.click(screen.getByRole("button", { name: /^Macro 2/ }));
  expect(await screen.findByDisplayValue("immediate")).toBeInTheDocument();
});

it.each(["invalid string", "oversized string", "combo loading"])(
  "blocks Save for %s",
  async (condition) => {
    const user = await openPage();
    if (condition === "combo loading") mockCombo.isLoading = true;
    const input = screen.getAllByRole("textbox")[1];
    if (condition === "oversized string") {
      fireEvent.change(input, { target: { value: "a".repeat(255) } });
    } else {
      await user.clear(screen.getByDisplayValue("aa"));
      await user.type(input, condition === "invalid string" ? "😀" : "latest");
    }
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(saveCalls()).toHaveLength(0);
  },
);

it.each([
  ["macro", "Saved runtime macro changes."],
  ["combo", "Saved 3 runtime combo changes."],
  ["mixed", "Saved runtime macros and 3 runtime combo changes."],
])(
  "reports only changed domains for %s edits when both are available",
  async (domain, message) => {
    mockCombo.isAvailable = true;
    mockCombo.hasPendingChanges = domain !== "macro";
    const user = await openPage();
    if (domain !== "combo") {
      await user.clear(screen.getByDisplayValue("aa"));
      await user.type(screen.getAllByRole("textbox")[1], "changed");
    }
    mockCapture.mockClear();
    await user.click(screen.getByRole("button", { name: "Save" }));
    if (domain !== "combo") {
      expect(mockCombo.saveChanges).not.toHaveBeenCalled();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      await completeWrite();
    }
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(message),
    );
    expect(saveCalls()).toHaveLength(1);
    expect(mockCombo.saveChanges).toHaveBeenCalledTimes(1);
    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(getKeyTapSequenceString(flash[0].steps[0])).toBe(
      domain === "combo" ? "aa" : "changed",
    );
  },
);

it("clears an earlier success before a delayed attempt and reports no overall success after partial failure", async () => {
  mockCombo.isAvailable = true;
  const user = await openPage();
  await user.clear(screen.getByDisplayValue("aa"));
  await user.type(screen.getAllByRole("textbox")[1], "first");
  await user.click(screen.getByRole("button", { name: "Save" }));
  await completeWrite();
  await screen.findByText("Saved runtime macro changes.");

  mockCombo.hasPendingChanges = true;
  mockCombo.saveChanges.mockImplementation(async () => {
    mockCombo.error = "Combo save failed";
    return null;
  });
  finishWrite = undefined;
  await user.clear(screen.getByDisplayValue("first"));
  await user.type(screen.getAllByRole("textbox")[1], "second");
  mockCapture.mockClear();
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(mockCombo.saveChanges).toHaveBeenCalledTimes(1);
  await completeWrite();
  await screen.findByText("Combo save failed");
  expect(getKeyTapSequenceString(flash[0].steps[0])).toBe("second");
  expect(mockCombo.hasPendingChanges).toBe(true);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(mockCapture).not.toHaveBeenCalled();
});

it("does not save combos or report success when the macro save fails in a mixed attempt", async () => {
  mockCombo.isAvailable = true;
  mockCombo.hasPendingChanges = true;
  failSave = true;
  const user = await openPage();
  await user.clear(screen.getByDisplayValue("aa"));
  await user.type(screen.getAllByRole("textbox")[1], "failed");
  mockCapture.mockClear();
  await user.click(screen.getByRole("button", { name: "Save" }));
  await completeWrite();
  await screen.findByText("Flash save failed");
  expect(mockCombo.saveChanges).not.toHaveBeenCalled();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(mockCapture).not.toHaveBeenCalled();
});

it("does not report success or save when nothing changed", async () => {
  mockCombo.isAvailable = true;
  const user = await openPage();
  const save = screen.getByRole("button", { name: "Save" });
  expect(save).toBeDisabled();
  await user.click(save);
  expect(saveCalls()).toHaveLength(0);
  expect(mockCombo.saveChanges).not.toHaveBeenCalled();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("saves combo-only firmware without claiming macros were saved", async () => {
  mockMacroAvailable = false;
  mockCombo.isAvailable = true;
  mockCombo.hasPendingChanges = true;
  const user = await openPage();
  mockCapture.mockClear();
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "Saved 3 runtime combo changes.",
    ),
  );
  expect(saveCalls()).toHaveLength(0);
  expect(mockCombo.saveChanges).toHaveBeenCalledTimes(1);
  expect(mockCapture).toHaveBeenCalledTimes(1);
});

it("does not offer Save when neither subsystem is available", async () => {
  mockMacroAvailable = false;
  await openPage();
  expect(
    screen.queryByRole("button", { name: "Save" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(saveCalls()).toHaveLength(0);
  expect(mockCombo.saveChanges).not.toHaveBeenCalled();
});

it("renders one tapdance section alongside the macro/combo editors", async () => {
  await openPage();
  expect(
    screen.getAllByText("Runtime tapdance subsystem is unavailable."),
  ).toHaveLength(1);
});

it("refreshes shared tapdance reference counts when returning to the retained tab", async () => {
  mockTabActive = false;
  const value = {
    isConnected: true,
    deviceName: "Test",
    onConnect: () => {},
    onDisconnect: () => {},
    isLoading: false,
    error: null,
    isReconnecting: false,
    onCancelReconnect: () => {},
  };
  const view = render(
    <ConnectionContext.Provider value={value}>
      <MacroComboPage />
    </ConnectionContext.Provider>,
  );
  await screen.findByDisplayValue("aa");
  expect(mockReloadKeymap).not.toHaveBeenCalled();
  mockTabActive = true;
  view.rerender(
    <ConnectionContext.Provider value={value}>
      <MacroComboPage />
    </ConnectionContext.Provider>,
  );
  expect(mockReloadKeymap).toHaveBeenCalledTimes(1);
});

it("places named tapdances after macros and combos and shows the selected editor on the right", async () => {
  const { Config, State, GlobalResponse } =
    await import("../../proto/cormoran/runtime_tapdance/runtime_tapdance");
  mockTapDance.isAvailable = true;
  mockTapDance.entries = [
    State.create({
      index: 7,
      name: "Alphabet",
      config: Config.create({
        singleBinding: { behaviorId: 10, param1: 0x70004 },
        doubleBinding: {},
        tripleBinding: {},
      }),
    }),
  ];
  mockTapDance.globalSettings = GlobalResponse.create({
    apiVersion: 2,
    maxEntries: 16,
    maxNameLength: 24,
    usedEntries: 1,
    poolBytesTotal: 512,
  });
  mockKeymapModel = {
    layers: [{ id: 0, name: "Base", bindings: [] }],
    availableLayers: 1,
    maxLayerNameLength: 32,
  };
  mockCombo.isAvailable = true;
  mockTapDance.create.mockImplementation(async (name: string) => {
    mockTapDance.entries.push(
      State.create({
        index: 42,
        name,
        config: Config.create({
          singleBinding: {},
          doubleBinding: {},
          tripleBinding: {},
        }),
        hasUnsavedChanges: true,
      }),
    );
    return 42;
  });
  const user = await openPage();
  const headings = screen
    .getAllByRole("heading", { level: 2 })
    .map((el) => el.textContent);
  expect(headings.indexOf("Tapdances")).toBeGreaterThan(
    headings.indexOf("Combos"),
  );
  expect(headings.indexOf("Combos")).toBeGreaterThan(
    headings.indexOf("Macros"),
  );
  expect(
    screen.queryByRole("group", { name: "Single" }),
  ).not.toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Alphabet", exact: true }),
  );
  expect(screen.getByRole("group", { name: "Single" })).toBeInTheDocument();
  expect(screen.queryByDisplayValue("aa")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("combobox", { name: "Tapdance slot" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Tapdance 1", exact: true }),
  ).not.toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "New tapdance", exact: true }),
  );
  expect(mockTapDance.create).toHaveBeenCalledWith("Tapdance 1");
  expect(
    screen.getByRole("button", { name: /^Tapdance 1/ }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Apply to memory" }),
  ).toBeDisabled();
});
