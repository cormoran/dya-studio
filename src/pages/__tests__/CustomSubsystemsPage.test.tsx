/**
 * Tests for CustomSubsystemsPage component
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CustomSubsystemsPage } from "../CustomSubsystemsPage";
import {
  ZMKAppProvider,
  createMockZMKApp,
  createMockSubsystems,
} from "@cormoran/zmk-studio-react-hook/testing";

// Mock the navigation utility so we can verify calls without touching window.location
jest.mock("../../lib/navigate");
import { navigateTo } from "../../lib/navigate";
const mockNavigateTo = navigateTo as jest.MockedFunction<typeof navigateTo>;

const APPROVED_URL_DIGESTS_KEY = "dya-studio-approved-subsystem-url-digests";
const LEGACY_TRUSTED_URLS_KEY = "dya-studio-trusted-subsystem-urls";

describe("CustomSubsystemsPage", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigateTo.mockReset();
  });

  const renderComponent = (zmkAppOverrides = {}) => {
    const mockZMKApp = createMockZMKApp(zmkAppOverrides);
    return {
      mockZMKApp,
      ...render(
        <ZMKAppProvider value={mockZMKApp}>
          <CustomSubsystemsPage />
        </ZMKAppProvider>,
      ),
    };
  };

  describe("Page Header", () => {
    it("should render the page header", () => {
      renderComponent();
      expect(screen.getByText("Custom Subsystems")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Available custom firmware subsystems and their web interfaces",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("should show empty state message when no subsystems are available", () => {
      renderComponent();
      expect(
        screen.getByText(/No custom subsystems available/),
      ).toBeInTheDocument();
    });
  });

  describe("Subsystem Listing", () => {
    it("should render subsystems with identifier and index", () => {
      const subsystems = createMockSubsystems([
        { index: 0, identifier: "zmk__unsupported_a", uiUrl: [] },
        { index: 1, identifier: "zmk__battery", uiUrl: [] },
      ]);
      renderComponent({
        state: {
          connection: null,
          deviceInfo: null,
          customSubsystems: subsystems,
          isLoading: false,
          error: null,
        },
      });

      expect(screen.getByText("zmk__unsupported_a")).toBeInTheDocument();
      expect(screen.getByText("zmk__battery")).toBeInTheDocument();
    });

    it("should show subsystem index", () => {
      const subsystems = createMockSubsystems([
        { index: 3, identifier: "my__subsystem", uiUrl: [] },
      ]);
      renderComponent({
        state: {
          connection: null,
          deviceInfo: null,
          customSubsystems: subsystems,
          isLoading: false,
          error: null,
        },
      });

      expect(screen.getByText("Subsystem index: 3")).toBeInTheDocument();
    });

    it("should show 'no web UI' message when uiUrl is empty", () => {
      const subsystems = createMockSubsystems([
        { index: 0, identifier: "zmk__unsupported_b", uiUrl: [] },
      ]);
      renderComponent({
        state: {
          connection: null,
          deviceInfo: null,
          customSubsystems: subsystems,
          isLoading: false,
          error: null,
        },
      });

      expect(
        screen.getByText("No web UI available for this subsystem."),
      ).toBeInTheDocument();
    });

    it("should render UI URL links when uiUrl is populated", () => {
      const subsystems = createMockSubsystems([
        {
          index: 0,
          identifier: "zmk__custom",
          uiUrl: ["https://example.com/ui"],
        },
      ]);
      renderComponent({
        state: {
          connection: null,
          deviceInfo: null,
          customSubsystems: subsystems,
          isLoading: false,
          error: null,
        },
      });

      expect(screen.getByText("https://example.com/ui")).toBeInTheDocument();
    });

    it("should render multiple UI URLs for a subsystem", () => {
      const subsystems = createMockSubsystems([
        {
          index: 0,
          identifier: "zmk__custom",
          uiUrl: ["https://example.com/ui", "https://another.example.com/app"],
        },
      ]);
      renderComponent({
        state: {
          connection: null,
          deviceInfo: null,
          customSubsystems: subsystems,
          isLoading: false,
          error: null,
        },
      });

      expect(screen.getByText("https://example.com/ui")).toBeInTheDocument();
      expect(
        screen.getByText("https://another.example.com/app"),
      ).toBeInTheDocument();
    });
  });

  describe("Supported subsystem grouping", () => {
    it("should list unsupported subsystems directly and hide already-supported ones inside a collapsed section", () => {
      const subsystems = createMockSubsystems([
        { index: 0, identifier: "zmk__unsupported", uiUrl: [] },
        { index: 1, identifier: "zmk__settings", uiUrl: [] },
      ]);
      renderComponent({
        state: {
          connection: null,
          deviceInfo: null,
          customSubsystems: subsystems,
          isLoading: false,
          error: null,
        },
      });

      // Unsupported subsystem is visible right away.
      expect(screen.getByText("zmk__unsupported")).toBeInTheDocument();
      // Already-supported subsystem is tucked inside a collapsed section.
      expect(screen.queryByText("zmk__settings")).not.toBeInTheDocument();
      expect(
        screen.getByText("Already supported by DYA Studio"),
      ).toBeInTheDocument();
    });

    it("should reveal already-supported subsystems when the section is expanded", () => {
      const subsystems = createMockSubsystems([
        { index: 0, identifier: "zmk__unsupported", uiUrl: [] },
        { index: 1, identifier: "zmk__settings", uiUrl: [] },
      ]);
      renderComponent({
        state: {
          connection: null,
          deviceInfo: null,
          customSubsystems: subsystems,
          isLoading: false,
          error: null,
        },
      });

      fireEvent.click(screen.getByText("Already supported by DYA Studio"));

      expect(screen.getByText("zmk__settings")).toBeInTheDocument();
    });

    it("should treat the fast-keymap subsystem as already supported", () => {
      const subsystems = createMockSubsystems([
        { index: 0, identifier: "cormoran__fast_keymap", uiUrl: [] },
      ]);
      renderComponent({
        state: {
          connection: null,
          deviceInfo: null,
          customSubsystems: subsystems,
          isLoading: false,
          error: null,
        },
      });

      // Fast keymap powers the Keymap tab, so it is grouped under the
      // collapsed "already supported" section rather than shown prominently.
      expect(
        screen.queryByText("cormoran__fast_keymap"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(
          "All custom subsystems reported by this device are already supported by DYA Studio.",
        ),
      ).toBeInTheDocument();
    });

    it("should keep the setting-expose subsystem as a prominent external card", () => {
      const subsystems = createMockSubsystems([
        {
          index: 0,
          identifier: "zmk__setting_expose",
          uiUrl: [
            "https://cormoran.github.io/zmk-feature-zephyr-setting-expose/",
          ],
        },
      ]);
      renderComponent({
        state: {
          connection: null,
          deviceInfo: null,
          customSubsystems: subsystems,
          isLoading: false,
          error: null,
        },
      });

      // No dedicated DYA Studio UI: shown prominently with its external web UI.
      expect(screen.getByText("zmk__setting_expose")).toBeInTheDocument();
      expect(
        screen.getByText(
          "https://cormoran.github.io/zmk-feature-zephyr-setting-expose/",
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Already supported by DYA Studio"),
      ).not.toBeInTheDocument();
    });

    it("should not show the collapsed section when no subsystems are already supported", () => {
      const subsystems = createMockSubsystems([
        { index: 0, identifier: "zmk__unsupported", uiUrl: [] },
      ]);
      renderComponent({
        state: {
          connection: null,
          deviceInfo: null,
          customSubsystems: subsystems,
          isLoading: false,
          error: null,
        },
      });

      expect(
        screen.queryByText("Already supported by DYA Studio"),
      ).not.toBeInTheDocument();
    });

    it("should show a message when every reported subsystem is already supported", () => {
      const subsystems = createMockSubsystems([
        { index: 0, identifier: "zmk__settings", uiUrl: [] },
      ]);
      renderComponent({
        state: {
          connection: null,
          deviceInfo: null,
          customSubsystems: subsystems,
          isLoading: false,
          error: null,
        },
      });

      expect(
        screen.getByText(
          "All custom subsystems reported by this device are already supported by DYA Studio.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("External Link Security Warning", () => {
    const subsystemWithUrl = createMockSubsystems([
      {
        index: 0,
        identifier: "zmk__custom",
        uiUrl: ["https://example.com/ui"],
      },
    ]);

    const renderWithSubsystems = (zmkAppOverrides = {}) =>
      renderComponent({
        state: {
          connection: null,
          deviceInfo: null,
          customSubsystems: subsystemWithUrl,
          isLoading: false,
          error: null,
        },
        ...zmkAppOverrides,
      });

    it("should show security warning dialog when URL is clicked", async () => {
      renderWithSubsystems();

      fireEvent.click(screen.getByText("https://example.com/ui"));

      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("External Link Warning")).toBeInTheDocument();
    });

    it("should display the URL in the warning dialog", async () => {
      renderWithSubsystems();

      fireEvent.click(screen.getByText("https://example.com/ui"));

      await waitFor(() =>
        expect(
          screen.getAllByText("https://example.com/ui").length,
        ).toBeGreaterThan(1),
      );
    });

    it("should display security notice text", async () => {
      renderWithSubsystems();

      fireEvent.click(screen.getByText("https://example.com/ui"));

      expect(
        await screen.findByText(
          /please do not connect to an unreliable author/i,
        ),
      ).toBeInTheDocument();
    });

    it("should close the dialog when Cancel is clicked", async () => {
      renderWithSubsystems();

      fireEvent.click(screen.getByText("https://example.com/ui"));
      expect(await screen.findByRole("dialog")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Cancel"));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should close the dialog when backdrop is clicked", async () => {
      renderWithSubsystems();

      fireEvent.click(screen.getByText("https://example.com/ui"));
      expect(await screen.findByRole("dialog")).toBeInTheDocument();

      // Click on the backdrop (the dialog element itself)
      fireEvent.click(screen.getByRole("dialog"));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should close the dialog when close button is clicked", async () => {
      renderWithSubsystems();

      fireEvent.click(screen.getByText("https://example.com/ui"));
      expect(await screen.findByRole("dialog")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("Close dialog"));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should navigate in current tab when 'Open' is clicked", async () => {
      renderWithSubsystems();

      fireEvent.click(screen.getByText("https://example.com/ui"));
      fireEvent.click(await screen.findByText("Open"));

      await waitFor(() =>
        expect(mockNavigateTo).toHaveBeenCalledWith("https://example.com/ui"),
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should disconnect before navigating when 'Open' is clicked", async () => {
      const { mockZMKApp } = renderWithSubsystems();

      fireEvent.click(screen.getByText("https://example.com/ui"));
      fireEvent.click(await screen.findByText("Open"));

      await waitFor(() =>
        expect(mockZMKApp.disconnect).toHaveBeenCalledTimes(1),
      );
    });
  });

  describe("Don't show again", () => {
    const subsystemWithUrl = createMockSubsystems([
      {
        index: 0,
        identifier: "zmk__custom",
        uiUrl: ["https://example.com/ui"],
      },
    ]);

    const renderWithSubsystems = () =>
      renderComponent({
        state: {
          connection: null,
          deviceInfo: null,
          customSubsystems: subsystemWithUrl,
          isLoading: false,
          error: null,
        },
      });

    it("should show 'don't show again' checkbox in the dialog", async () => {
      renderWithSubsystems();

      fireEvent.click(screen.getByText("https://example.com/ui"));

      expect(
        await screen.findByLabelText(/trust this url and don't warn/i),
      ).toBeInTheDocument();
    });

    it("should store only a URL digest when 'don't show again' is checked and Open is clicked", async () => {
      renderWithSubsystems();

      fireEvent.click(screen.getByText("https://example.com/ui"));
      fireEvent.click(
        await screen.findByLabelText(/trust this url and don't warn/i),
      );
      fireEvent.click(screen.getByText("Open"));

      await waitFor(() => {
        const stored = JSON.parse(
          localStorage.getItem(APPROVED_URL_DIGESTS_KEY) ?? "[]",
        ) as string[];
        expect(stored).toHaveLength(1);
        expect(stored[0]).toMatch(/^[a-f0-9]{64}$/);
      });
    });

    it("should not save URL to localStorage when 'don't show again' is unchecked", async () => {
      renderWithSubsystems();

      fireEvent.click(screen.getByText("https://example.com/ui"));
      // leave checkbox unchecked
      fireEvent.click(await screen.findByText("Open"));

      const stored = localStorage.getItem(APPROVED_URL_DIGESTS_KEY);
      expect(stored).toBeNull();
    });

    it("should migrate legacy approvals and skip the warning dialog", async () => {
      localStorage.setItem(
        LEGACY_TRUSTED_URLS_KEY,
        JSON.stringify(["https://example.com/ui"]),
      );

      renderWithSubsystems();

      fireEvent.click(screen.getByText("https://example.com/ui"));

      await waitFor(() =>
        expect(mockNavigateTo).toHaveBeenCalledWith("https://example.com/ui"),
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(localStorage.getItem(LEGACY_TRUSTED_URLS_KEY)).toBeNull();
    });
  });
});
