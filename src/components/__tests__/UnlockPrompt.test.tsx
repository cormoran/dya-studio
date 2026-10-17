import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import { UnlockPrompt } from "../UnlockPrompt";
import { loadFastKeymap } from "../../lib/fastKeymap";
import { binding, guideModel } from "../../testUtils/unlockGuide";

jest.mock("../../hooks/useCustomSubsystem", () => ({
  useCustomSubsystem: jest.fn(),
}));
jest.mock("../../lib/fastKeymap", () => ({
  ...jest.requireActual("../../lib/fastKeymap"),
  loadFastKeymap: jest.fn(),
}));
import { useCustomSubsystem } from "../../hooks/useCustomSubsystem";
const mockSubsystem = useCustomSubsystem as jest.Mock;
const mockLoad = loadFastKeymap as jest.Mock;
const call = jest.fn();
const subsystem = { index: 0 };
const generic = "Press the studio unlock key combination on your keyboard";
const model = () =>
  guideModel([
    [binding(2, 1), binding(0)],
    [binding(6), binding(1)],
  ]);

function modal(
  connection: object,
  open = true,
  onClose = jest.fn(),
  onRetry = jest.fn(),
) {
  return (
    <ZMKAppContext.Provider
      value={{ state: { connection, deviceInfo: { name: "test" } } } as never}
    >
      <UnlockPrompt open={open} onClose={onClose} onRetry={onRetry} />
    </ZMKAppContext.Provider>
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  mockSubsystem.mockReturnValue({ subsystem, ready: true, call });
  mockLoad.mockResolvedValue(model());
});
it("shows generic instructions while reading, then highlights both keys with hold instructions", async () => {
  let finish!: (value: ReturnType<typeof model>) => void;
  mockLoad.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  render(modal({}));
  expect(screen.getByText(generic)).toBeInTheDocument();
  await act(async () => finish(model()));
  expect(
    screen.getByRole("img", { name: "Unlock key positions" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Hold the blue key marked A and keep holding."),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Press the orange key marked B (Studio Unlock)."),
  ).toBeInTheDocument();
  expect(screen.queryByText(generic)).not.toBeInTheDocument();
  expect(mockSubsystem).toHaveBeenCalledWith(
    "cormoran__fast_keymap",
    expect.anything(),
    { unlockGate: false },
  );
});
it("retains generic guidance when unsupported, without a read", () => {
  mockSubsystem.mockReturnValue({ subsystem: null, ready: false, call });
  render(modal({}));
  expect(screen.getByText(generic)).toBeInTheDocument();
  expect(mockLoad).not.toHaveBeenCalled();
});
it.each(["failed", "inaccessible"])("falls back for %s data", async (kind) => {
  if (kind === "failed") mockLoad.mockRejectedValue(new Error("secured"));
  else mockLoad.mockResolvedValue(guideModel([[binding(0)]]));
  render(modal({}));
  await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(1));
  expect(screen.getByText(generic)).toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
it("discards late results after reconnect and reloads on reopen", async () => {
  let finish!: (value: ReturnType<typeof model>) => void;
  mockLoad
    .mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    )
    .mockResolvedValue(guideModel([[binding(0)]]));
  const first = {};
  const second = {};
  const { rerender } = render(modal(first));
  rerender(modal(second));
  await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(2));
  await act(async () => finish(model()));
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  rerender(modal(second, false));
  expect(
    screen.queryByText("Keyboard Unlock Required"),
  ).not.toBeInTheDocument();
  mockLoad.mockResolvedValue(model());
  rerender(modal(second));
  await screen.findByRole("img");
  expect(mockLoad).toHaveBeenCalledTimes(3);
});
it("keeps Retry and Cancel wired with the guide visible", async () => {
  const close = jest.fn(),
    retry = jest.fn();
  render(modal({}, true, close, retry));
  await screen.findByRole("img");
  await userEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(retry).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(close).toHaveBeenCalledTimes(1);
});

it("keeps the same color and letter when a released key is used again for unlock", async () => {
  mockLoad.mockResolvedValue(guideModel([[binding(4, 1)], [binding(1)]]));
  render(modal({}));
  const preview = await screen.findByRole("img");
  expect(
    screen.getByText("Press and release the blue key marked A."),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Press the blue key marked A (Studio Unlock)."),
  ).toBeInTheDocument();
  expect(preview.querySelectorAll("rect")).toHaveLength(1);
  expect(preview.querySelector("text")).toHaveTextContent("A");
});

it("labels all four possible guide keys and gives their text at least 4.5:1 contrast", async () => {
  const rows = Array.from({ length: 4 }, (_, layer) =>
    Array.from({ length: 4 }, (_, position) =>
      position === layer
        ? binding(layer === 3 ? 1 : 2, layer === 3 ? 0 : layer + 1)
        : binding(6),
    ),
  );
  mockLoad.mockResolvedValue(guideModel(rows));
  render(modal({}));
  const preview = await screen.findByRole("img");
  const groups = [...preview.querySelectorAll("g")];
  expect(groups.map((g) => g.querySelector("text")?.textContent)).toEqual([
    "A",
    "B",
    "C",
    "D",
  ]);
  expect(
    new Set(groups.map((g) => g.querySelector("rect")?.getAttribute("fill")))
      .size,
  ).toBe(4);
  const luminance = (hex: string) => {
    const rgb = hex.match(/[0-9a-f]{2}/gi)!.map((part) => {
      const c = parseInt(part, 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  for (const group of groups) {
    const bg = luminance(group.querySelector("rect")!.getAttribute("fill")!);
    const fg = luminance(group.querySelector("text")!.getAttribute("fill")!);
    expect(
      (Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05),
    ).toBeGreaterThanOrEqual(4.5);
  }
});
