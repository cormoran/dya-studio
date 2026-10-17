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
    screen.getByText("Hold key 0 on Layer 0 and keep holding."),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Press Studio Unlock at key 1 on Layer 1."),
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
