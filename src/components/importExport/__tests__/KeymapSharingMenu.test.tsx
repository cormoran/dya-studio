import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KeymapSharingMenu } from "../KeymapSharingMenu";
import { LanguageProvider } from "../../../contexts/LanguageContext";
jest.mock("../../../hooks/useAbyssAuth", () => ({
  useAbyssAuth: () => mockAuth,
}));
jest.mock("../../../hooks/useKeymapSharing", () => ({
  useKeymapSharing: () => mockSharing,
}));
const mockAuth = {
  isAuthenticated: false,
  isConfigured: true,
  isLoading: false,
  user: null as unknown,
  login: jest.fn(),
  logout: jest.fn(),
  error: null,
};
const mockSharing = {
  busy: false,
  error: null,
  message: null,
  savedKeymapUrl: null as string | null,
  current: null as unknown,
  keymaps: [] as unknown[],
  changed: false,
  identity: "unsupported",
  review: null as unknown,
  refresh: jest.fn(),
  prepare: jest.fn(),
  confirm: jest.fn(),
  create: jest.fn().mockResolvedValue(true),
  saveFile: jest.fn(),
  fileError: jest.fn(),
  setReview: jest.fn(),
  selectDirection: jest.fn(),
};
const record = { id: "one", name: "My layout" };
function show() {
  render(
    <LanguageProvider>
      <KeymapSharingMenu onApplied={jest.fn()} />
    </LanguageProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Save/share keymap" }));
}
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.setItem("dya-studio-language", "en");
  mockAuth.isAuthenticated = false;
  mockAuth.user = null;
  mockSharing.current = null;
  mockSharing.keymaps = [];
  mockSharing.changed = false;
  mockSharing.review = null;
  mockSharing.savedKeymapUrl = null;
});
it("shows login, search and file actions while signed out", () => {
  show();
  expect(
    screen.getByRole("button", { name: "Sign in with Abyss" }),
  ).toBeEnabled();
  expect(screen.getByRole("link", { name: /Find on Abyss/ })).toHaveAttribute(
    "href",
    expect.stringMatching(/\/discover$/),
  );
  expect(screen.getByRole("button", { name: "Save to file" })).toBeEnabled();
  expect(screen.queryByRole("region", { name: "Your keymaps" })).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Save new to Abyss" }),
  ).toBeNull();
  expect(
    screen.getByText(/Keyboard Abyss is a keymap sharing service/),
  ).toBeInTheDocument();
  expect(
    screen
      .getByRole("button", { name: "Sign in with Abyss" })
      .querySelector("img"),
  ).toBeTruthy();
  expect(mockSharing.refresh).not.toHaveBeenCalled();
});
it("shows the account and unsupported notice without hiding owned maps", () => {
  mockAuth.isAuthenticated = true;
  mockAuth.user = {
    username: "tester",
    avatarUrl: "https://example.com/avatar.png",
  };
  mockSharing.keymaps = [record];
  show();
  expect(screen.getByText("@tester")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
  expect(
    screen.getByText(/Keymap identity RPC is not supported/),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /My layout/ }));
  expect(mockSharing.prepare).toHaveBeenCalledWith("apply", record);
  expect(mockSharing.confirm).not.toHaveBeenCalled();
  expect(mockSharing.refresh).toHaveBeenCalledTimes(1);
});
it("opens the current map by selecting its row", () => {
  mockAuth.isAuthenticated = true;
  mockAuth.user = { username: "tester" };
  mockSharing.current = record;
  mockSharing.changed = true;
  show();
  fireEvent.click(screen.getByRole("button", { name: /My layout/ }));
  expect(mockSharing.prepare).toHaveBeenCalledWith("apply", record);
});
it("new keymaps default to private and require a nonempty name", async () => {
  mockAuth.isAuthenticated = true;
  mockAuth.user = { username: "tester" };
  show();
  fireEvent.click(screen.getByRole("button", { name: "Save new to Abyss" }));
  expect(screen.getByRole("combobox", { name: "Visibility" })).toHaveValue(
    "private",
  );
  expect(screen.getByRole("button", { name: "Save to Abyss" })).toBeDisabled();
  fireEvent.change(screen.getByRole("textbox", { name: "Keymap name" }), {
    target: { value: "New layout" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Visibility" }), {
    target: { value: "public" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save to Abyss" }));
  await waitFor(() =>
    expect(mockSharing.create).toHaveBeenCalledWith("New layout", "public"),
  );
});
it("shows a preview for the current map even when it is in sync", () => {
  mockAuth.isAuthenticated = true;
  mockAuth.user = { username: "tester" };
  mockSharing.current = record;
  show();
  expect(screen.getByText("In sync")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /My layout/ })).toBeEnabled();
  expect(
    screen.getByRole("button", { name: "Refresh your keymaps" }),
  ).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Refresh" })).toBeNull();
});

it("opens an owned map from the full row without a Preview button", () => {
  mockAuth.isAuthenticated = true;
  mockSharing.keymaps = [record];
  show();
  expect(screen.queryByRole("button", { name: /Preview/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "My layout" }));
  expect(mockSharing.prepare).toHaveBeenCalledWith("apply", record);
  expect(mockSharing.confirm).not.toHaveBeenCalled();
});

it("keeps the last saved record accessible if automatic opening was blocked", () => {
  mockAuth.isAuthenticated = true;
  mockSharing.savedKeymapUrl =
    "https://abyss.keyboard-hub.com/keymap/saved-one";
  show();
  const link = screen.getByRole("link", { name: "Open on Abyss" });
  expect(link).toHaveAttribute("href", mockSharing.savedKeymapUrl);
  expect(link).toHaveAttribute("target", "_blank");
});

describe("mobile sharing dialog", () => {
  let mobile: boolean;
  let onChange: () => void;
  beforeEach(() => {
    mobile = true;
    const original = (window.matchMedia as jest.Mock).getMockImplementation()!;
    jest.spyOn(window, "matchMedia").mockImplementation((query) => ({
      ...original(query),
      matches: query === "(max-width: 639px)" && mobile,
      addEventListener: (_event, listener) => {
        onChange = listener as () => void;
      },
      removeEventListener: jest.fn(),
    }));
  });
  afterEach(() => jest.restoreAllMocks());

  it("offers all signed-out actions and dismisses without writes, returning focus", async () => {
    const user = userEvent.setup();
    show();
    const trigger = screen.getByRole("button", {
      name: "Save/share keymap",
      hidden: true,
    });
    expect(
      screen.getByRole("heading", { name: "Save/share keymap" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Apply from file" }),
    ).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(trigger);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Save/share keymap" });
    await user.click(dialog.previousElementSibling as Element);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mockSharing.prepare).not.toHaveBeenCalled();
    expect(mockSharing.confirm).not.toHaveBeenCalled();
    expect(mockSharing.create).not.toHaveBeenCalled();
  });

  it("can open and cancel the new-map dialog above the mobile menu", async () => {
    const user = userEvent.setup();
    mockAuth.isAuthenticated = true;
    mockAuth.user = { username: "tester" };
    show();
    await user.click(screen.getByRole("button", { name: "Save new to Abyss" }));
    expect(
      screen.getByRole("dialog", { name: "Save new to Abyss" }),
    ).toBeVisible();
    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("dialog", { name: "Save/share keymap" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("dialog", { name: "Save new to Abyss" }),
    ).toBeNull();
    expect(mockSharing.create).not.toHaveBeenCalled();
  });

  it("switches to a nonmodal popover when resized without refreshing the account again", () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = { username: "tester" };
    mockSharing.keymaps = [record];
    show();
    expect(
      screen.getByRole("heading", { name: "Save/share keymap" }),
    ).toBeVisible();
    act(() => {
      mobile = false;
      onChange();
    });
    expect(
      screen.queryByRole("heading", { name: "Save/share keymap" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    expect(screen.getByRole("button", { name: "My layout" })).toBeEnabled();
    expect(mockSharing.refresh).toHaveBeenCalledTimes(1);
  });
});

it("shows differences and opens each current-map action in its selected direction only", () => {
  mockAuth.isAuthenticated = true;
  mockSharing.current = record;
  mockSharing.keymaps = [record, { id: "two", name: "Other map" }];
  mockSharing.changed = true;
  show();
  expect(screen.getByText("Differences found")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Sync to Abyss" }));
  expect(mockSharing.prepare).toHaveBeenLastCalledWith("save", record);
  fireEvent.click(screen.getByRole("button", { name: "Overwrite from Abyss" }));
  expect(mockSharing.prepare).toHaveBeenLastCalledWith("apply", record);
  expect(screen.getAllByRole("button", { name: "Sync to Abyss" })).toHaveLength(
    1,
  );
  expect(mockSharing.confirm).not.toHaveBeenCalled();
});
