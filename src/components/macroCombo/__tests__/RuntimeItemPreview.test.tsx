import { render, screen } from "@testing-library/react";
import { MacroItemPreview, TapDanceItemPreview } from "../RuntimeItemPreview";
import { RuntimeListCard } from "../RuntimeListCard";
import { stringToKeyTapSequenceStep } from "../macroStepUtils";
import { Config } from "../../../proto/cormoran/runtime_tapdance/runtime_tapdance";

const behaviors = new Map([
  [10, { id: 10, displayName: "Key Press", metadata: [] }],
]);
const binding = { behaviorId: 10, param1: 0x70004, param2: 0 };

it("previews strings, key down/up, taps and waits without changing the item name", () => {
  const preview = (
    <MacroItemPreview
      behaviors={behaviors}
      context={{}}
      macro={{
        slot: 1,
        name: "Sequence",
        encodedSize: 0,
        steps: [
          stringToKeyTapSequenceStep("test")!,
          { down: binding },
          { up: binding },
          { tap: binding },
          { delay: { delayMs: 125 } },
        ],
      }}
    />
  );
  render(
    <RuntimeListCard
      title="Macros"
      addLabel="New macro"
      settingsLabel="Settings"
      busy={false}
      error={null}
      onAdd={jest.fn()}
      onSettings={jest.fn()}
      items={[
        { id: 1, name: "Sequence", dirty: false, onClick: jest.fn(), preview },
      ]}
    />,
  );
  const item = screen.getByRole("button", { name: "Sequence", exact: true });
  expect(item).toHaveAccessibleDescription(
    '"test" Down: A Up: A Tap: A Delay: 125 ms',
  );
  expect(
    screen.getByTitle('"test" → Down: A → Up: A → Tap: A → Delay: 125 ms'),
  ).toBeInTheDocument();
});

it("shows tap counts only for assigned actions and distinguishes an empty entry", () => {
  const { rerender } = render(
    <TapDanceItemPreview
      behaviors={behaviors}
      context={{}}
      config={Config.create({
        singleBinding: binding,
        tripleBinding: { ...binding, param1: 0x70006 },
      })}
    />,
  );
  expect(screen.getByTitle("1×: A → 3×: C")).toBeInTheDocument();
  expect(screen.queryByText("2×")).not.toBeInTheDocument();
  rerender(
    <TapDanceItemPreview
      behaviors={behaviors}
      context={{}}
      config={Config.create()}
    />,
  );
  expect(screen.getByText("Not set")).toBeInTheDocument();
});
