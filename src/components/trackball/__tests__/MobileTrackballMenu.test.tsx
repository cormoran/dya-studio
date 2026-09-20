import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import { MobileTrackballMenu } from "../MobileTrackballMenu";

describe("MobileTrackballMenu", () => {
  it("shows the selected processor type and name", () => {
    render(
      <LanguageProvider>
        <MobileTrackballMenu
          processors={[
            {
              id: "processor-0",
              label: "Trackball processor",
              selected: true,
              onSelect: jest.fn(),
            },
          ]}
          drivers={[]}
        />
      </LanguageProvider>,
    );

    const trigger = screen.getByRole("button", {
      name: "Select processor or PMW3610 driver",
    });
    expect(trigger).toHaveTextContent("Processor");
    expect(trigger).toHaveTextContent("Trackball processor");
  });

  it("selects a driver, preserves its status dot, and closes the menu", async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(
      <LanguageProvider>
        <MobileTrackballMenu
          processors={[
            {
              id: "processor-0",
              label: "Trackball processor",
              selected: false,
              onSelect: jest.fn(),
            },
          ]}
          drivers={[
            {
              id: "driver-1",
              label: "cormoran__pmw3610",
              selected: true,
              status: "unsaved",
              onSelect,
            },
          ]}
        />
      </LanguageProvider>,
    );

    const trigger = screen.getByRole("button", {
      name: "Select processor or PMW3610 driver",
    });
    expect(trigger).toHaveTextContent("PMW3610 Driver");
    expect(trigger).toHaveTextContent("cormoran__pmw3610");
    expect(within(trigger).getByLabelText("Unsaved")).toBeInTheDocument();

    await user.click(trigger);
    const driver = screen.getByRole("menuitem", {
      name: /cormoran__pmw3610/,
    });
    expect(within(driver).getByLabelText("Unsaved")).toBeInTheDocument();
    await user.click(driver);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("shows empty states for both sections", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <MobileTrackballMenu processors={[]} drivers={[]} />
      </LanguageProvider>,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Select processor or PMW3610 driver",
      }),
    );

    expect(screen.getByText("No processors found")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No pmw3610 driver settings were reported by the keyboard.",
      ),
    ).toBeInTheDocument();
  });
});
