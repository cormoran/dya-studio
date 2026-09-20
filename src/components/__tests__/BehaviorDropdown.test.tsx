import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BehaviorDropdown } from "../BehaviorDropdown";
import { BEHAVIORS } from "../../lib/transport/behaviors";

const behaviors = new Map(BEHAVIORS.map((behavior) => [behavior.id, behavior]));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

function renderDropdown() {
  const onSelect = jest.fn();
  render(
    <BehaviorDropdown
      behaviors={behaviors}
      selectedBehaviorId={null}
      onSelect={onSelect}
      onQuickSelect={jest.fn()}
    />,
  );
  return onSelect;
}

it("uses one Misc category, focuses search on desktop, and searches across categories", async () => {
  const user = userEvent.setup();
  renderDropdown();

  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Select behavior" }));

  const search = screen.getByPlaceholderText("Search behaviors...");
  expect(search).toHaveFocus();
  expect(screen.getByRole("button", { name: "Misc" })).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Others" }),
  ).not.toBeInTheDocument();

  await user.type(search, "mouse");

  expect(screen.getByText("Mouse Key Press")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Misc" }),
  ).not.toBeInTheDocument();
});

it("persists quick-select visibility and allows a visible item to be pinned", async () => {
  const user = userEvent.setup();
  renderDropdown();

  await user.click(screen.getByRole("button", { name: "Select behavior" }));
  await user.click(
    screen.getByRole("button", { name: "Configure Quick Select" }),
  );

  expect(screen.getByText("Quick Select settings")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Key Press Shown" }));
  expect(
    JSON.parse(
      localStorage.getItem(
        "behaviorDropdownQuickSelects:kp|lt|mt|none|transparent",
      ) || "{}",
    ).hiddenPresets,
  ).toContain("kp");

  await user.click(
    screen.getAllByRole("button", { name: "Pin this behavior" })[0],
  );
  expect(
    screen.getByRole("button", { name: "Unpin this behavior" }),
  ).toBeInTheDocument();
});
