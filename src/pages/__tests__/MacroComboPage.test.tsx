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

const mockCall = jest.fn();
const mockUnlock = jest.fn(() => true);
const mockCapture = jest.fn();
const mockCombo = {
  isAvailable: false,
  isLoading: false,
  hasPendingChanges: false,
  globalSettings: null,
  combos: [],
  error: null,
};
jest.mock("../../hooks/useCustomSubsystem", () => ({
  useCustomSubsystem: () => ({
    subsystem: { index: 0 },
    ready: true,
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
  useKeymap: () => ({ behaviors: new Map(), keymap: null }),
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
  mockUnlock.mockReturnValue(true);
  mockCombo.isLoading = false;
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
  await screen.findByDisplayValue("aa");
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
  await completeWrite();
  await waitFor(() => expect(saveCalls()).toHaveLength(1));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled(),
  );
  expect(getKeyTapSequenceString(flash[0].steps[0])).toBe("immediate");
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
