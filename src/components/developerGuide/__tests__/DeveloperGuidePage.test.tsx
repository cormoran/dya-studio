import { fireEvent, render, screen, within } from "@testing-library/react";
import { DeveloperGuidePage } from "../DeveloperGuidePage";
import type { DeveloperGuidePageDefinition } from "../types";

const page: DeveloperGuidePageDefinition = {
  title: "Trackball setup",
  description: "Configure a trackball.",
  activeNavigationId: "/developer-guide/modules/trackball",
  navigation: [
    {
      id: "/developer-guide/level-2",
      label: "Level 2",
      href: "/developer-guide/level-2",
      items: [
        {
          id: "/developer-guide/modules/trackball",
          label: "Trackball",
          href: "/developer-guide/modules/trackball",
        },
        {
          id: "/developer-guide/modules/settings",
          label: "Settings",
          href: "/developer-guide/modules/settings",
        },
      ],
    },
  ],
  sections: [],
};

describe("DeveloperGuidePage navigation", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/developer-guide/modules/trackball");
    jest.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows the active page in a collapsed mobile menu", () => {
    render(<DeveloperGuidePage page={page} />);

    const disclosure = screen.getByText("Menu").closest("details");

    expect(disclosure).not.toHaveAttribute("open");
    expect(disclosure).toHaveTextContent("Developer guide");
    expect(disclosure).toHaveTextContent("Trackball");
  });

  it("closes the mobile menu after navigating", () => {
    render(<DeveloperGuidePage page={page} />);

    const disclosure = screen.getByText("Menu").closest("details");
    expect(disclosure).not.toBeNull();
    disclosure?.setAttribute("open", "");

    fireEvent.click(
      within(disclosure as HTMLElement).getByRole("link", {
        name: "Settings",
      }),
    );

    expect(disclosure).not.toHaveAttribute("open");
    expect(window.location.pathname).toBe("/developer-guide/modules/settings");
  });
});
