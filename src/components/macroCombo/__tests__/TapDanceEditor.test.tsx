import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { TapDanceEditor } from "../TapDanceEditor";
import {
  Config,
  State,
  GlobalResponse,
} from "../../../proto/cormoran/runtime_tapdance/runtime_tapdance";
import type { BehaviorBinding, Keymap } from "../../../hooks/useKeymap";
const mockSave = jest.fn();
const config = Config.create({
  singleBinding: { behaviorId: 10, param1: 0x70004 },
  doubleBinding: { behaviorId: 10, param1: 0x70005 },
  tripleBinding: { behaviorId: 10, param1: 0x70006 },
});
const mockRuntime = {
  isAvailable: true,
  entries: [State.create({ index: 0, name: "Alphabet", config })],
  globalSettings: GlobalResponse.create({
    apiVersion: 2,
    maxEntries: 16,
    maxNameLength: 24,
    poolBytesTotal: 512,
    usedEntries: 1,
  }),
  hasUnsavedChanges: false,
  create: jest.fn(),
  rename: jest.fn(),
  saveChanges: jest.fn(),
  discardChanges: jest.fn(),
  intervalMs: 200,
  revision: 1,
  busy: false,
  error: null,
  load: jest.fn(),
  save: mockSave,
  remove: jest.fn(),
  saveInterval: jest.fn(),
};
jest.mock("../../../hooks/useRuntimeTapDance", () => ({
  useRuntimeTapDance: () => mockRuntime,
}));
jest.mock("../../KeycodeSelector", () => ({
  KeycodeSelector: ({
    open,
    behaviors,
    onSelect,
    onClose,
  }: {
    open: boolean;
    behaviors: Map<number, unknown>;
    onSelect: (binding: BehaviorBinding) => void;
    onClose: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label="Choose action">
        <span>
          {behaviors.has(32) ? "Recursive allowed" : "Recursive excluded"}
        </span>
        <button
          onClick={() =>
            onSelect({ behaviorId: 10, param1: 0x70007, param2: 0 })
          }
        >
          Choose D
        </button>
        <button onClick={onClose}>Cancel action</button>
      </div>
    ) : null,
}));
const props = {
  behaviors: new Map([
    [10, { id: 10, displayName: "Key Press", metadata: [] }],
    [32, { id: 32, displayName: "Runtime Tap Dance", metadata: [] }],
  ]),
  layers: [],
  keymap: {
    layers: [
      {
        bindings: [
          { behaviorId: 32, param1: 0 },
          { behaviorId: 32, param1: 0 },
        ],
      },
    ],
  } as Keymap,
};
beforeEach(() => {
  jest.clearAllMocks();
  mockSave.mockResolvedValue(true);
});
it("edits a shared action locally, discards, then saves the draft through an explicit action", async () => {
  render(<TapDanceEditor {...props} slot={0} currentSlot={0} />);
  expect(screen.getByText(/updates 1 other tapdance/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "Double" }));
  fireEvent.click(
    within(screen.getByRole("tabpanel")).getAllByRole("button")[0],
  );
  expect(screen.getByText("Recursive excluded")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Choose D"));
  expect(mockSave).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Save tapdance" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Discard edits" }));
  expect(screen.getByRole("button", { name: "Save tapdance" })).toBeDisabled();
  fireEvent.click(
    within(screen.getByRole("tabpanel")).getAllByRole("button")[0],
  );
  fireEvent.click(screen.getByText("Choose D"));
  fireEvent.click(screen.getByRole("button", { name: "Save tapdance" }));
  await waitFor(() =>
    expect(mockSave).toHaveBeenCalledWith(
      0,
      expect.objectContaining({
        doubleBinding: { behaviorId: 10, param1: 0x70007, param2: 0 },
      }),
      true,
    ),
  );
  expect(await screen.findByRole("status")).toHaveTextContent("Tapdance saved");
});
it("rejects a Triple action without Double", () => {
  render(<TapDanceEditor {...props} slot={0} />);
  fireEvent.click(screen.getByRole("tab", { name: "Double" }));
  fireEvent.click(screen.getByRole("button", { name: "Clear" }));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "A Triple action requires a Double action",
  );
  expect(screen.getByRole("button", { name: "Save tapdance" })).toBeDisabled();
});
it("opens New/Edit modals and closes without writing any local draft", () => {
  render(<TapDanceEditor {...props} slot={0} />);
  fireEvent.click(screen.getByRole("button", { name: "New tapdance" }));
  const dialog = screen.getByRole("dialog", { name: "New tapdance" });
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Select binding" }),
  );
  fireEvent.click(screen.getByText("Choose D"));
  fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(mockSave).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Edit tapdance" }));
  expect(
    screen.getByRole("dialog", { name: "Edit tapdance · Alphabet" }),
  ).toBeInTheDocument();
});

it("applies the selected slot explicitly without saving actions", () => {
  const onUseSlot = jest.fn();
  render(<TapDanceEditor {...props} slot={0} onUseSlot={onUseSlot} />);
  fireEvent.click(screen.getByRole("button", { name: "Use tapdance" }));
  expect(onUseSlot).toHaveBeenCalledWith(0);
  expect(mockSave).not.toHaveBeenCalled();
});

it("allocates once and preserves the returned stable ID when saving a new modal draft is retried", async () => {
  mockRuntime.create.mockResolvedValue(42);
  mockSave.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const onSlotChange = jest.fn();
  render(<TapDanceEditor {...props} slot={0} onSlotChange={onSlotChange} />);
  fireEvent.click(screen.getByRole("button", { name: "New tapdance" }));
  const dialog = screen.getByRole("dialog", { name: "New tapdance" });
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Name" }), {
    target: { value: "New dance" },
  });
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Select binding" }),
  );
  fireEvent.click(screen.getByText("Choose D"));
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Save tapdance" }),
  );
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
  expect(mockRuntime.create).toHaveBeenCalledWith("New dance");
  expect(mockSave).toHaveBeenLastCalledWith(
    42,
    expect.objectContaining({
      singleBinding: { behaviorId: 10, param1: 0x70007, param2: 0 },
    }),
  );
  expect(
    screen.getByRole("dialog", { name: "New tapdance" }),
  ).toBeInTheDocument();
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Save tapdance" }),
  );
  await waitFor(() => expect(onSlotChange).toHaveBeenCalledWith(42));
  expect(mockRuntime.create).toHaveBeenCalledTimes(1);
  expect(mockSave).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("requires a unique name within the firmware UTF-8 byte limit before creating", () => {
  render(<TapDanceEditor {...props} slot={0} />);
  fireEvent.click(screen.getByRole("button", { name: "New tapdance" }));
  const dialog = screen.getByRole("dialog", { name: "New tapdance" });
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Select binding" }),
  );
  fireEvent.click(screen.getByText("Choose D"));
  const name = within(dialog).getByRole("textbox", { name: "Name" });
  const save = within(dialog).getByRole("button", { name: "Save tapdance" });
  fireEvent.change(name, { target: { value: "Alphabet" } });
  expect(save).toBeDisabled();
  fireEvent.change(name, { target: { value: "あ".repeat(8) + "a" } });
  expect(save).toBeDisabled();
  fireEvent.change(name, { target: { value: "あ".repeat(8) } });
  expect(save).toBeEnabled();
  expect(mockRuntime.create).not.toHaveBeenCalled();
});
