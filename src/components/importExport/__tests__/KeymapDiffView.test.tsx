/**
 * Tests for the writeback diff view.
 *
 * This is what the user reads before agreeing to change their keyboard, so the
 * things worth pinning are that every change is reachable and that a huge diff
 * degrades to counts rather than rendering hundreds of rows.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KeymapDiffView } from "../KeymapDiffView";
import { EMPTY_DIFF, type KeymapDiff } from "../../../lib/abyss/abyssDiff";

function bindingChanges(count: number, layerIndex = 0) {
  return Array.from({ length: count }, (_, keyIndex) => ({
    layerIndex,
    layerName: `Layer ${layerIndex}`,
    keyIndex,
    from: { type: "trans" },
    to: { type: "key", usage: 0x04 },
  }));
}

describe("KeymapDiffView", () => {
  it("summarises each category as a chip", () => {
    const diff: KeymapDiff = {
      ...EMPTY_DIFF,
      bindingChanges: bindingChanges(2),
      layerNameChanges: [{ layerIndex: 0, from: "Base", to: "Alpha" }],
      comboChanges: [{ index: 0, label: "Combo 1", to: {} }],
    };

    render(<KeymapDiffView diff={diff} />);

    expect(screen.getByText("2 bindings")).toBeInTheDocument();
    expect(screen.getByText("1 layer names")).toBeInTheDocument();
    expect(screen.getByText("1 combos")).toBeInTheDocument();
    // Categories with nothing in them are omitted rather than shown as zero.
    expect(screen.queryByText(/macros/)).not.toBeInTheDocument();
  });

  it("groups changes into one card per layer", () => {
    const diff: KeymapDiff = {
      ...EMPTY_DIFF,
      bindingChanges: [...bindingChanges(1, 0), ...bindingChanges(2, 3)],
    };

    render(<KeymapDiffView diff={diff} />);

    expect(screen.getByText("1 changes")).toBeInTheDocument();
    expect(screen.getByText("2 changes")).toBeInTheDocument();
  });

  it("caps the row list until the user asks for the rest", async () => {
    const diff: KeymapDiff = {
      ...EMPTY_DIFF,
      bindingChanges: bindingChanges(80),
    };

    render(<KeymapDiffView diff={diff} />);
    // Layer cards start collapsed, so open it first.
    await userEvent.click(screen.getByRole("button", { name: "Layer 0" }));

    expect(screen.getByText("#0")).toBeInTheDocument();
    expect(screen.queryByText("#60")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("Show all 80 keys"));
    expect(screen.getByText("#60")).toBeInTheDocument();
  });

  it("degrades to counts for a whole-keymap replacement", async () => {
    // 300 rows is both slow to render and useless to read; the counts and an
    // explicit opt-in are more honest than a wall of text.
    const diff: KeymapDiff = {
      ...EMPTY_DIFF,
      bindingChanges: bindingChanges(300),
    };

    render(<KeymapDiffView diff={diff} />);

    expect(
      screen.getByText(/This replaces most of the keymap/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Layer 0" }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("Show the full list anyway"));
    expect(screen.getByRole("button", { name: "Layer 0" })).toBeInTheDocument();
  });

  it("separates global module changes from layer-scoped ones", () => {
    const diff: KeymapDiff = {
      ...EMPTY_DIFF,
      moduleChanges: [
        { scope: "global", moduleName: "trackball" },
        { scope: "layer", layerIndex: 1, moduleName: "encoder" },
      ],
    };

    render(<KeymapDiffView diff={diff} />);

    // The global one sits outside any layer card.
    expect(screen.getByText("trackball")).toBeInTheDocument();
    expect(screen.getByText("1 changes")).toBeInTheDocument();
  });

  it("renders nothing alarming for an empty diff", () => {
    render(<KeymapDiffView diff={EMPTY_DIFF} />);
    expect(screen.queryByText(/bindings/)).not.toBeInTheDocument();
  });
});
