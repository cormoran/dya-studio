import { fireEvent, render, screen } from "@testing-library/react";
import { LanguageContext } from "../../contexts/language";
import { translate, type Language } from "../../i18n/translations";
import { SplashScreen } from "../SplashScreen";

describe("SplashScreen", () => {
  test("renders the normal connect state with three connect buttons", () => {
    const onConnect = jest.fn();

    render(
      <SplashScreen onConnect={onConnect} isConnecting={false} error={null} />,
    );

    expect(screen.getByLabelText("Connect via USB")).toBeInTheDocument();
    expect(screen.getByLabelText("Connect via Bluetooth")).toBeInTheDocument();
    expect(screen.getByLabelText("Try Demo Mode")).toBeInTheDocument();
  });

  test("disables the connect buttons while isConnecting is true", () => {
    const onConnect = jest.fn();

    render(
      <SplashScreen onConnect={onConnect} isConnecting={true} error={null} />,
    );

    expect(screen.getByLabelText("Connect via USB")).toBeInTheDocument();
    expect(screen.getByLabelText("Connect via USB")).toBeDisabled();
    expect(screen.getByLabelText("Connect via Bluetooth")).toBeDisabled();
    expect(screen.getByLabelText("Try Demo Mode")).toBeDisabled();
  });

  test("shows an error message when provided", () => {
    const onConnect = jest.fn();

    render(
      <SplashScreen
        onConnect={onConnect}
        isConnecting={false}
        error="Something went wrong"
      />,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not connect to the keyboard.",
    );
  });
});

const serialError =
  "Failed to open the serial port. Check the permissions of the device and verify it is not in use by another process.";
function localizedSplash(language: Language, error: string) {
  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: jest.fn(),
        toggleLanguage: jest.fn(),
        t: (key, params) => translate(language, key, params),
      }}
    >
      <SplashScreen
        onConnect={jest.fn()}
        isConnecting={false}
        error={error}
        onShowReleaseNotes={jest.fn()}
        onShowDeveloperGuide={jest.fn()}
      />
    </LanguageContext.Provider>
  );
}

test.each([
  serialError,
  "Failed to execute 'open' on 'SerialPort': Failed to open serial port.",
  "Failed to open the WebUSB device. Check the permissions of the device and verify it is not in use by another process.",
  "Failed to claim the CDC interface on the WebUSB device. Check that it is not in use by another app or browser tab.",
])(
  "explains a port-open failure in Japanese and retains collapsed diagnostics: %s",
  (error) => {
    render(localizedSplash("ja", error));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "別のタブの DYA Studio や他のアプリが使用している可能性があります",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "閉じてからもう一度お試しください",
    );
    const details = screen.getByText("エラーの詳細").closest("details")!;
    expect(details.open).toBe(false);
    fireEvent.click(screen.getByText("エラーの詳細"));
    expect(details.open).toBe(true);
    expect(details).toHaveTextContent(error);
    expect(screen.getByLabelText("USB で接続")).toBeEnabled();
  },
);

test("updates an existing error when the language changes", () => {
  const { rerender } = render(localizedSplash("en", serialError));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Another DYA Studio tab or app may be using it",
  );
  rerender(localizedSplash("ja", serialError));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "キーボードへの接続を開けませんでした",
  );
});

test.each([
  [
    "Connection timed out: the device did not respond.",
    "接続がタイムアウトしました",
  ],
  [
    "GATT operation failed for an unknown reason.",
    "キーボードに接続できませんでした",
  ],
])(
  "localizes timeout and unknown errors without claiming the keyboard is busy",
  (error, expected) => {
    render(localizedSplash("ja", error));
    expect(screen.getByRole("alert")).toHaveTextContent(expected);
    expect(screen.getByRole("alert")).not.toHaveTextContent(
      "別のタブの DYA Studio",
    );
    expect(screen.getByText(error)).toBeInTheDocument();
  },
);

test.each([
  ["Keyboard developer guide", "/developer-guide", "guide"],
  [/Release notes/, "/release-notes", "releases"],
] as const)(
  "provides a native link for %s and intercepts only ordinary clicks",
  (name, href, target) => {
    const guide = jest.fn();
    const releases = jest.fn();
    render(
      <SplashScreen
        onConnect={jest.fn()}
        isConnecting={false}
        error={null}
        onShowDeveloperGuide={guide}
        onShowReleaseNotes={releases}
      />,
    );
    const link = screen.getByRole("link", { name });
    expect(link).toHaveAttribute("href", href);
    const callback = target === "guide" ? guide : releases;
    for (const modifiers of [
      { ctrlKey: true },
      { metaKey: true },
      { shiftKey: true },
      { altKey: true },
      { button: 1 },
    ]) {
      const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        ...modifiers,
      });
      link.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(callback).not.toHaveBeenCalled();
      // Prevent jsdom's asynchronous navigation after checking native semantics.
      event.preventDefault();
    }
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(callback).toHaveBeenCalledTimes(1);
  },
);
