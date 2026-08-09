/**
 * Tests for the JSON diff modal.
 *
 * Mirrors Keyboard Abyss's diff editor, so the controls under test are the two
 * it offers: inline vs side-by-side, and context around changes vs the whole
 * document.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JsonDiffModal } from "../JsonDiffModal";

const before = {
  keyboard: "dya2",
  layers: Array.from({ length: 30 }, (_, index) => ({
    name: index === 15 ? "Before" : `Layer ${index}`,
    bindings: [index],
  })),
};
const after = {
  ...before,
  layers: before.layers.map((layer, index) =>
    index === 15 ? { ...layer, name: "After" } : layer,
  ),
};

function open(props: Partial<Parameters<typeof JsonDiffModal>[0]> = {}) {
  return render(
    <JsonDiffModal
      open
      onOpenChange={() => {}}
      title="Changes to write"
      description="Left: device. Right: Abyss."
      before={before}
      after={after}
      {...props}
    />,
  );
}

/** Rendered diff lines, however the current view mode lays them out. */
function diffLines() {
  return document.querySelectorAll(".diff-line");
}

describe("JsonDiffModal", () => {
  it("renders nothing until opened", () => {
    render(
      <JsonDiffModal
        open={false}
        onOpenChange={() => {}}
        title="Changes to write"
        description="d"
        before={before}
        after={after}
      />,
    );

    expect(screen.queryByText("Changes to write")).not.toBeInTheDocument();
  });

  it("fills the screen on phones and centres from tablet up", () => {
    open();

    // A 95vw/90vh sheet wastes edges that matter most where there are fewest of
    // them, and a diff is the densest thing in this app.
    const dialog = screen.getByRole("dialog");
    // `w-screen` rather than `inset-x-0`: a fixed element's containing block is
    // not always the layout viewport, and where they differ inset-x stretched
    // the sheet past the screen and pushed the close button off it.
    expect(dialog.className).toContain("w-screen");
    expect(dialog.className).toContain("diff-sheet");
    // dvh rather than vh: mobile browser chrome shrinks the visual viewport,
    // and 100vh would extend behind it.
    expect(dialog.className).toContain("h-dvh");
    expect(dialog.className).toContain("max-h-dvh");
    expect(dialog.className).toContain("tablet:w-[95vw]");
    expect(dialog.className).toContain("tablet:h-[90vh]");
  });

  it("lets the diff scroll inside the dialog instead of growing it", () => {
    // A flex child defaults to `min-height: auto`, so without min-h-0 a long
    // diff refuses to shrink and pushes the dialog past the bottom of the
    // screen. This is the whole reason the modal overflowed.
    const { container } = open();

    const scroller = container.ownerDocument.querySelector(".abyss-diff");
    expect(scroller?.className).toContain("min-h-0");
    expect(scroller?.className).toContain("min-w-0");
    expect(scroller?.className).toContain("overflow-auto");
  });

  it("shows the title and which side is which", () => {
    open();

    expect(screen.getByText("Changes to write")).toBeInTheDocument();
    expect(screen.getByText("Left: device. Right: Abyss.")).toBeInTheDocument();
  });

  it("starts inline and switches to side by side", async () => {
    open();

    const inline = screen.getByRole("button", { name: "Inline" });
    const split = screen.getByRole("button", { name: "Side by side" });
    expect(inline).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(split);

    expect(split).toHaveAttribute("aria-pressed", "true");
    expect(inline).toHaveAttribute("aria-pressed", "false");
  });

  it("shows more lines when switched to the entire file", async () => {
    open();
    const collapsed = diffLines().length;

    await userEvent.click(screen.getByRole("button", { name: "Entire file" }));

    // The whole point of the toggle: a 30-layer document with one changed line
    // should not render every line by default.
    expect(diffLines().length).toBeGreaterThan(collapsed);
  });

  it("hides the context toggle when nothing is hidden anyway", () => {
    // A control that does nothing when clicked is worse than no control.
    open({ before: { a: 1 }, after: { a: 2 } });

    expect(
      screen.queryByRole("button", { name: "Entire file" }),
    ).not.toBeInTheDocument();
  });

  it("says so when the two documents are identical", () => {
    open({ before, after: before });

    expect(screen.getByText("No differences.")).toBeInTheDocument();
    expect(diffLines()).toHaveLength(0);
  });

  it("renders the changed values", () => {
    open();

    expect(screen.getByText(/"After"/)).toBeInTheDocument();
    expect(screen.getByText(/"Before"/)).toBeInTheDocument();
  });
});
