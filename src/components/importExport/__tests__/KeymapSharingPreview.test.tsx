import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ShareReview } from "../../../hooks/useKeymapSharing";
import { KeymapSharingPreview } from "../KeymapSharingPreview";
import { EMPTY_DIFF } from "../../../lib/abyss/abyssDiff";
import { LanguageProvider } from "../../../contexts/LanguageContext";

const before = {
  keyboard: "board",
  name: "Device",
  layers: [
    { name: "Base", bindings: [{ type: "trans" }] },
    { name: "Nav", bindings: [{ type: "trans" }] },
  ],
};
const after = {
  ...before,
  name: "Remote",
  layers: [
    { name: "Base", bindings: [{ type: "none" }] },
    { name: "Nav", bindings: [{ type: "key", usage: 4 }] },
  ],
};
const diff = {
  ...EMPTY_DIFF,
  comboChanges: [
    {
      index: 0,
      label: "Global combo",
      to: { positions: [0, 1], binding: { type: "none" } },
    },
  ],
  bindingChanges: [
    {
      layerIndex: 0,
      layerName: "Base",
      keyIndex: 0,
      from: { type: "trans" },
      to: { type: "none" },
    },
    {
      layerIndex: 1,
      layerName: "Nav",
      keyIndex: 0,
      from: { type: "trans" },
      to: { type: "key", usage: 4 },
    },
  ],
};
const base = {
  kind: "apply",
  remote: after,
  record: { id: "one", name: "My map" },
  loaded: {
    state: {
      currentKeymap: before,
      detectedLayout: { positions: [{ x: 0, y: 0, w: 1, h: 1 }] },
    },
  },
  resolved: null,
  before,
  after,
  diff,
  checks: [],
} as unknown as ShareReview;
const confirm = jest.fn();
const close = jest.fn();
function Harness({
  canSave = true,
  busy = false,
  blocked = false,
}: {
  canSave?: boolean;
  busy?: boolean;
  blocked?: boolean;
}) {
  const [review, setReview] = useState(base);
  return (
    <LanguageProvider>
      <KeymapSharingPreview
        review={
          blocked
            ? {
                ...review,
                checks: [
                  {
                    id: "keys",
                    level: "blocked",
                    message: "Incompatible layout",
                  },
                ],
              }
            : review
        }
        canSave={canSave}
        busy={busy}
        error={null}
        onClose={close}
        onConfirm={confirm}
        onDirectionChange={(kind) =>
          setReview((current) => ({
            ...current,
            kind,
            before: kind === "save" ? after : before,
            after: kind === "save" ? before : after,
          }))
        }
      />
    </LanguageProvider>
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.setItem("dya-studio-language", "en");
});
it("starts with the visual preview, all layers expanded, and filters the list without hiding global changes", () => {
  render(<Harness />);
  expect(screen.getByRole("tab", { name: "Keymap preview" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(
    screen.getByRole("combobox", { name: "Filter changes by layer" }),
  ).toHaveValue("all");
  expect(screen.getByRole("button", { name: "Base" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  expect(screen.getByRole("button", { name: "Nav" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  fireEvent.change(
    screen.getByRole("combobox", { name: "Filter changes by layer" }),
    { target: { value: "1" } },
  );
  const changes = screen.getByRole("region", { name: "Changes" });
  expect(within(changes).queryByRole("button", { name: "Base" })).toBeNull();
  expect(
    within(changes).getByRole("button", { name: "Nav" }),
  ).toBeInTheDocument();
  expect(within(changes).getByText("Global combo")).toBeInTheDocument();
});
it("lets the user inspect JSON in a tab within the same modal", async () => {
  render(<Harness />);
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Code diff" }), {
    button: 0,
    ctrlKey: false,
  });
  fireEvent.keyDown(screen.getByRole("tab", { name: "Code diff" }), {
    key: "Enter",
  });
  fireEvent.click(screen.getByRole("tab", { name: "Code diff" }));
  expect(
    await screen.findByRole("button", { name: "Inline" }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
});
it("requires a second confirmation for Apply; cancel returns to preview and writes nothing", () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
  expect(
    screen.getByRole("dialog", { name: "Apply My map" }),
  ).toBeInTheDocument();
  expect(confirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog", { name: "Apply My map" })).toBeNull();
  expect(confirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
  fireEvent.click(screen.getByRole("button", { name: "Apply to keyboard" }));
  expect(confirm).toHaveBeenCalledTimes(1);
});
it("switches to the cloud-save direction and requires confirmation before saving", () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(
    screen.getByRole("dialog", { name: "Save to My map" }),
  ).toBeInTheDocument();
  expect(confirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save to Abyss" }));
  expect(confirm).toHaveBeenCalledTimes(1);
});
it("keeps Save unavailable for files or another user's map, and blocks incompatible Apply", () => {
  render(<Harness canSave={false} blocked />);
  expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
});
it("shows action help on hover", async () => {
  render(<Harness />);
  await userEvent.hover(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByRole("tooltip")).toHaveTextContent(
    "Update this Abyss keymap",
  );
});

it("Escape cancels only the confirmation and returns to the existing preview", async () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await userEvent.keyboard("{Escape}");
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
  expect(close).not.toHaveBeenCalled();
  expect(confirm).not.toHaveBeenCalled();
});
