import { fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import { KeymapApplyResultModal } from "../KeymapApplyResultModal";
import { EMPTY_DIFF } from "../../../lib/abyss/abyssDiff";
import type { KeymapApplyResult } from "../../../lib/abyss/keymapApplyResult";
const close = jest.fn();
const result: KeymapApplyResult = {
  name: "My map",
  verified: true,
  attempted: true,
  error: null,
  remaining: EMPTY_DIFF,
  skipped: EMPTY_DIFF,
};
const show = (value: KeymapApplyResult) =>
  render(
    <LanguageProvider>
      <KeymapApplyResultModal result={value} onClose={close} />
    </LanguageProvider>,
  );
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.setItem("dya-studio-language", "en");
});
it("reports successful readback and closes independently of the preview", () => {
  show(result);
  expect(
    screen.getByRole("dialog", { name: "Keyboard write result" }),
  ).toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent("Applied to keyboard.");
  expect(screen.queryByRole("region", { name: "Skipped changes" })).toBeNull();
  fireEvent.click(screen.getAllByRole("button", { name: "Close" })[1]);
  expect(close).toHaveBeenCalledTimes(1);
});
it("lists skipped raw bindings and never labels them fully applied", () => {
  show({
    ...result,
    skipped: {
      ...EMPTY_DIFF,
      bindingChanges: [
        {
          layerIndex: 0,
          layerName: "Base",
          keyIndex: 2,
          from: { type: "trans" },
          to: { type: "raw", label: "Custom", zmk: "&custom" },
        },
      ],
    },
  });
  expect(screen.getByRole("status")).toHaveTextContent(
    "Finished with skipped changes.",
  );
  expect(
    screen.getByRole("region", { name: "Skipped changes" }),
  ).toHaveTextContent("&custom");
  expect(screen.getByText(/do not associate/)).toBeInTheDocument();
});
it("keeps actual error details and unmatched changes in the result", () => {
  show({
    ...result,
    verified: false,
    error: "RPC failed",
    remaining: {
      ...EMPTY_DIFF,
      layerNameChanges: [{ layerIndex: 0, from: "Base", to: "New base" }],
    },
  });
  expect(screen.getByRole("alert")).toHaveTextContent("RPC failed");
  expect(
    screen.getByRole("region", { name: "Changes still not reflected" }),
  ).toHaveTextContent("New base");
  expect(
    screen.getByText(/Some settings may have been written/),
  ).toBeInTheDocument();
});
