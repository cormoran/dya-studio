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

  it("groups modules in named cards with their scope", () => {
    const diff: KeymapDiff = {
      ...EMPTY_DIFF,
      moduleChanges: [
        { scope: "global", moduleName: "trackball" },
        { scope: "layer", layerIndex: 1, moduleName: "encoder" },
      ],
    };

    render(<KeymapDiffView diff={diff} defaultExpanded />);

    // Modules have their own cards.
    expect(screen.getByText("trackball")).toBeInTheDocument();
    expect(screen.getByText("Global settings")).toBeInTheDocument();
    expect(screen.getByText("Layer 1")).toBeInTheDocument();
  });

  it("renders nothing alarming for an empty diff", () => {
    render(<KeymapDiffView diff={EMPTY_DIFF} />);
    expect(screen.queryByText(/bindings/)).not.toBeInTheDocument();
  });
});

it("shows nested before/after module fields at global and layer scope", () => {
  render(
    <KeymapDiffView
      defaultExpanded
      diff={{
        ...EMPTY_DIFF,
        moduleChanges: [
          {
            scope: "global",
            moduleName: "ball",
            from: { settings: { speed: 2, enabled: true } },
            to: { settings: { speed: 0, enabled: false } },
          },
          {
            scope: "layer",
            layerIndex: 0,
            moduleName: "encoder",
            from: { values: [1, 2] },
            to: { values: [3] },
          },
        ],
      }}
    />,
  );
  expect(
    screen.getByRole("region", { name: "Module: ball" }),
  ).toHaveTextContent('$["settings"]["speed"]2 → 0');
  expect(
    screen.getByRole("region", { name: "Module: ball" }),
  ).toHaveTextContent("true → false");
  expect(
    screen.getByRole("region", { name: "Module: encoder" }),
  ).toHaveTextContent('$["values"][1]2 → Not set');
});

it("keeps unsupported bindings and module scopes visible as skipped only for keyboard writes", () => {
  const diff: KeymapDiff = {
    ...EMPTY_DIFF,
    bindingChanges: [
      {
        layerIndex: 0,
        layerName: "Base",
        keyIndex: 0,
        to: { type: "raw", zmk: "&unknown" },
      },
    ],
    moduleChanges: [
      {
        scope: "layer",
        layerIndex: 0,
        moduleName: "ball",
        from: { type: "trackball", scale: 1 },
        to: { type: "trackball", scale: 2 },
      },
    ],
  };
  const { rerender } = render(
    <KeymapDiffView diff={diff} defaultExpanded markUnsupported />,
  );
  expect(
    screen.getByRole("region", {
      name: "Unsupported changes (will be skipped)",
    }),
  ).toHaveTextContent("&unknown");
  expect(
    screen.getByRole("region", {
      name: "Unsupported changes (will be skipped)",
    }),
  ).toHaveTextContent("ball");
  rerender(<KeymapDiffView diff={diff} defaultExpanded />);
  expect(
    screen.queryByRole("region", {
      name: "Unsupported changes (will be skipped)",
    }),
  ).toBeNull();
});
