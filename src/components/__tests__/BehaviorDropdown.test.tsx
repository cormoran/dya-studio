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

it("keeps Quick Select settings inside the dropdown in floating mode", async () => {
  const user = userEvent.setup();
  render(
    <BehaviorDropdown
      compact
      behaviors={behaviors}
      selectedBehaviorId={null}
      onSelect={jest.fn()}
      onQuickSelect={jest.fn()}
    />,
  );

  expect(
    screen.queryByRole("button", { name: "Configure Quick Select" }),
  ).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Select behavior" }));
  expect(
    screen.getByRole("button", { name: "Configure Quick Select" }),
  ).toBeInTheDocument();
});

it("uses one Misc category, focuses search on desktop, and searches across categories", async () => {
  const user = userEvent.setup();
  renderDropdown();

  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  const settingsButton = screen.getByRole("button", {
    name: "Configure Quick Select",
  });
  await user.click(settingsButton);
  expect(screen.getByText("Quick Select settings")).toBeInTheDocument();
  await user.click(settingsButton);

  await user.click(screen.getByRole("button", { name: "Select behavior" }));

  const search = screen.getByPlaceholderText("Search behaviors...");
  expect(search).toHaveFocus();
  expect(screen.getByRole("button", { name: "Misc" })).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Others" }),
  ).not.toBeInTheDocument();

  await user.click(settingsButton);
  expect(screen.getByText("Quick Select settings")).toBeInTheDocument();
  await user.click(search);
  expect(screen.queryByText("Quick Select settings")).not.toBeInTheDocument();

  await user.type(search, "mouse");

  expect(screen.getByText("Mouse Key Press")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Misc" }),
  ).not.toBeInTheDocument();

  await user.clear(search);
  await user.type(search, "automatically deactivates");

  expect(screen.getByText("Caps Word")).toBeInTheDocument();
});

it("uses one ordered settings list with separate preset visibility and pin controls", async () => {
  const user = userEvent.setup();
  renderDropdown();

  await user.click(screen.getByRole("button", { name: "Key Press" }));
  await user.click(screen.getByRole("button", { name: "Select behavior" }));
  await user.type(screen.getByPlaceholderText("Search behaviors..."), "mouse");
  await user.click(screen.getByText("Mouse Key Press"));
  await user.click(screen.getByRole("button", { name: "Select behavior" }));
  await user.click(
    screen.getByRole("button", { name: "Configure Quick Select" }),
  );

  expect(screen.getByText("Quick Select settings")).toBeInTheDocument();
  expect(screen.getAllByText("Preset")).toHaveLength(5);
  expect(screen.queryByText("Preset behaviors")).not.toBeInTheDocument();
  expect(screen.queryByText("Visible quick selects")).not.toBeInTheDocument();
  expect(screen.queryByText("Quick Select order")).not.toBeInTheDocument();

  await user.click(
    screen.getByRole("button", {
      name: "Hide this preset behavior: Key Press",
    }),
  );
  expect(
    JSON.parse(
      localStorage.getItem(
        "behaviorDropdownQuickSelects:kp|lt|mt|none|transparent",
      ) || "{}",
    ).hiddenPresets,
  ).toContain("kp");
  expect(
    screen.getAllByRole("button", { name: "Pin this behavior" }),
  ).toHaveLength(1);

  await user.click(screen.getByRole("button", { name: "Pin this behavior" }));
  expect(
    screen.getByRole("button", { name: "Unpin this behavior" }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Move up" })).toHaveLength(6);

  await user.click(
    screen.getByRole("button", { name: "Reset Quick Select settings" }),
  );
  expect(
    JSON.parse(
      localStorage.getItem(
        "behaviorDropdownQuickSelects:kp|lt|mt|none|transparent",
      ) || "{}",
    ),
  ).toEqual({ hiddenPresets: [], pinnedBehaviorNames: [], order: [] });
});
