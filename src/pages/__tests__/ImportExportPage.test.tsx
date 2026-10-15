/**
 * Tests for the Import/Export tab shell.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportExportPage } from "../ImportExportPage";
import type { UseAbyssAuthReturn } from "../../hooks/useAbyssAuth";

jest.mock("../../hooks/useAbyssAuth");
import { useAbyssAuth } from "../../hooks/useAbyssAuth";
const mockUseAbyssAuth = useAbyssAuth as jest.MockedFunction<
  typeof useAbyssAuth
>;

function auth(overrides: Partial<UseAbyssAuthReturn> = {}): UseAbyssAuthReturn {
  return {
    isConfigured: true,
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null,
    login: jest.fn(),
    logout: jest.fn(),
    ...overrides,
  };
}

describe("ImportExportPage", () => {
  beforeEach(() => {
    mockUseAbyssAuth.mockReset();
  });

  it("shows only the sign-in prompt when signed out", () => {
    mockUseAbyssAuth.mockReturnValue(auth());

    render(<ImportExportPage />);

    expect(
      screen.getByRole("button", { name: /Sign in with Abyss/ }),
    ).toBeInTheDocument();
    // The export/import sections are gated on being signed in.
    expect(screen.queryByText("Export")).not.toBeInTheDocument();
    expect(screen.queryByText("Import")).not.toBeInTheDocument();
  });

  it("shows the account and both sections when signed in", () => {
    mockUseAbyssAuth.mockReturnValue(
      auth({
        isAuthenticated: true,
        user: { sub: "u1", username: "cormoran", displayName: "Cormoran" },
      }),
    );

    render(<ImportExportPage />);

    expect(screen.getByText("Cormoran")).toBeInTheDocument();
    expect(screen.getByText("@cormoran")).toBeInTheDocument();
    expect(screen.getByText("Export")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
  });

  it("starts a login when the sign-in button is pressed", async () => {
    const login = jest.fn();
    mockUseAbyssAuth.mockReturnValue(auth({ login }));

    render(<ImportExportPage />);
    await userEvent.click(
      screen.getByRole("button", { name: /Sign in with Abyss/ }),
    );

    expect(login).toHaveBeenCalled();
  });

  it("explains missing OAuth configuration and disables sign-in", async () => {
    const login = jest.fn();
    mockUseAbyssAuth.mockReturnValue(auth({ isConfigured: false, login }));

    render(<ImportExportPage />);

    const signIn = screen.getByRole("button", { name: /Sign in with Abyss/ });
    expect(signIn).toBeDisabled();
    expect(
      screen.getByText(
        "Abyss sign-in is unavailable because this build has no OAuth client configuration.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/A sign-in window opens at/),
    ).not.toBeInTheDocument();

    await userEvent.click(signIn);
    expect(login).not.toHaveBeenCalled();
  });

  it("keeps sign-in disabled while configured auth is loading", () => {
    mockUseAbyssAuth.mockReturnValue(auth({ isLoading: true }));

    render(<ImportExportPage />);

    expect(
      screen.getByRole("button", { name: /Sign in with Abyss/ }),
    ).toBeDisabled();
    expect(screen.getByText(/A sign-in window opens at/)).toBeInTheDocument();
  });

  it("renders an auth error", () => {
    mockUseAbyssAuth.mockReturnValue(
      auth({ error: "Could not reach Abyss. Check your network connection." }),
    );

    render(<ImportExportPage />);

    expect(
      screen.getByText("Could not reach Abyss. Check your network connection."),
    ).toBeInTheDocument();
  });
});
