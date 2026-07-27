import { useEffect, useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TabNavigation, type TabItem } from "../TabNavigation";
import { useIsTabActive } from "../../hooks/useIsTabActive";

// A page that both holds local state (the input's value) and reports how many
// times it has mounted, so a test can tell "kept alive" from "re-created".
function StatefulPage({
  name,
  onMount,
}: {
  name: string;
  onMount?: () => void;
}) {
  const [value, setValue] = useState("");
  const isActive = useIsTabActive();
  useEffect(() => {
    onMount?.();
  }, [onMount]);
  return (
    <div>
      <input
        aria-label={`${name} input`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <span>{`${name} active: ${isActive}`}</span>
    </div>
  );
}

function renderTabs(tabs: TabItem[], initialTab = tabs[0].id) {
  function Harness() {
    const [activeTab, setActiveTab] = useState(initialTab);
    return (
      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    );
  }
  return render(<Harness />);
}

describe("TabNavigation", () => {
  test("a visited tab keeps its state after switching away and back", async () => {
    const user = userEvent.setup();
    const onMountFirst = jest.fn();
    renderTabs([
      {
        id: "first",
        label: "First",
        icon: null,
        content: <StatefulPage name="First" onMount={onMountFirst} />,
      },
      {
        id: "second",
        label: "Second",
        icon: null,
        content: <StatefulPage name="Second" />,
      },
    ]);

    await user.type(screen.getByLabelText("First input"), "draft");
    await user.click(screen.getByRole("tab", { name: "Second" }));
    await user.click(screen.getByRole("tab", { name: "First" }));

    expect(screen.getByLabelText("First input")).toHaveValue("draft");
    // Kept alive rather than torn down and rebuilt.
    expect(onMountFirst).toHaveBeenCalledTimes(1);
  });

  test("a tab is only mounted once it has been opened", async () => {
    const user = userEvent.setup();
    renderTabs([
      {
        id: "first",
        label: "First",
        icon: null,
        content: <div>first body</div>,
      },
      {
        id: "second",
        label: "Second",
        icon: null,
        content: <div>second body</div>,
      },
    ]);

    expect(screen.queryByText("second body")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Second" }));

    expect(screen.getByText("second body")).toBeInTheDocument();
  });

  test("an inactive tab's content sees itself as inactive", async () => {
    const user = userEvent.setup();
    renderTabs([
      {
        id: "first",
        label: "First",
        icon: null,
        content: <StatefulPage name="First" />,
      },
      {
        id: "second",
        label: "Second",
        icon: null,
        content: <StatefulPage name="Second" />,
      },
    ]);

    await user.click(screen.getByRole("tab", { name: "Second" }));

    // First is still mounted, but knows it is off-screen — that is the signal
    // pages use to pause streaming/polling.
    expect(screen.getByText("First active: false")).toBeInTheDocument();
    expect(screen.getByText("Second active: true")).toBeInTheDocument();
  });
});
