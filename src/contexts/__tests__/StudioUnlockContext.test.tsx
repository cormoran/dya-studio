import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import userEvent from "@testing-library/user-event";
import { MetaError } from "@zmkfirmware/zmk-studio-ts-client";
import { ErrorConditions } from "@zmkfirmware/zmk-studio-ts-client/meta";
import type { StudioLockState } from "@cormoran/zmk-studio-react-hook";
import { StudioUnlockProvider } from "../StudioUnlockContext";
import { useStudioUnlock } from "../../hooks/useStudioUnlock";
import { StudioUnlockCancelledError } from "../../lib/studioUnlock";

// Controllable lock state for the provider.
let mockLockState: StudioLockState = "locked";
jest.mock("@cormoran/zmk-studio-react-hook", () => ({
  ...jest.requireActual("@cormoran/zmk-studio-react-hook"),
  useStudioLockState: () => ({
    locked: mockLockState === "locked",
    lockState: mockLockState,
  }),
}));

const unlockError = () => new MetaError(ErrorConditions.UNLOCK_REQUIRED);

/**
 * Test harness: renders a button that runs `fn` through the unlock gate and
 * records the resolved value / rejection reason.
 */
function Harness({
  fn,
  onResolve = jest.fn(),
  onReject = jest.fn(),
  label = "run",
}: {
  fn: () => Promise<unknown>;
  onResolve?: (value: unknown) => void;
  onReject?: (reason: unknown) => void;
  label?: string;
}) {
  const { runWithUnlock } = useStudioUnlock();
  return (
    <button
      onClick={() => {
        runWithUnlock(fn).then(onResolve, onReject);
      }}
    >
      {label}
    </button>
  );
}

function setLockState(next: StudioLockState) {
  mockLockState = next;
}

describe("StudioUnlockProvider", () => {
  beforeEach(() => {
    mockLockState = "locked";
  });

  it("keeps the context value stable when the modal opens (regression: infinite refresh)", async () => {
    // If runWithUnlock/requireUnlock changed identity on a provider re-render,
    // every consumer's `call` (and its auto-load effect) would re-fire in a
    // loop. Opening the modal re-renders the provider; the value must not churn.
    const runWithUnlockRefs = new Set<unknown>();
    function Probe() {
      const { runWithUnlock } = useStudioUnlock();
      runWithUnlockRefs.add(runWithUnlock);
      return null;
    }
    const fn = jest.fn().mockRejectedValue(unlockError());

    render(
      <StudioUnlockProvider>
        <Probe />
        <Harness fn={fn} label="run" />
      </StudioUnlockProvider>,
    );
    expect(runWithUnlockRefs.size).toBe(1);

    await userEvent.click(screen.getByText("run"));
    await screen.findByText("Keyboard Unlock Required");

    // Still exactly one identity after the provider re-rendered to open the modal.
    expect(runWithUnlockRefs.size).toBe(1);
  });

  it("opens the modal proactively via requireUnlock while locked (Macro&Combo tab pattern)", async () => {
    // Mirrors MacroComboPage: a tab whose data needs unlock proactively opens
    // the modal on mount when the device is locked (mockLockState="locked").
    function ProactiveGate() {
      const { requireUnlock } = useStudioUnlock();
      useEffect(() => {
        requireUnlock();
      }, [requireUnlock]);
      return null;
    }

    render(
      <StudioUnlockProvider>
        <ProactiveGate />
      </StudioUnlockProvider>,
    );

    await screen.findByText("Keyboard Unlock Required");
  });

  it("resumes the parked action after unlock (requireUnlock onUnlocked)", async () => {
    // Mirrors KeymapPage's key click while locked: the gate returns false and
    // opens the modal, and the attempted action must replay once unlocked.
    const resumed = jest.fn();
    function Gate() {
      const { requireUnlock } = useStudioUnlock();
      return (
        <button
          onClick={() => {
            if (!requireUnlock(resumed)) return;
            resumed();
          }}
        >
          edit
        </button>
      );
    }

    const { rerender } = render(
      <StudioUnlockProvider>
        <Gate />
      </StudioUnlockProvider>,
    );

    // Locked: click parks the action and opens the modal without running it.
    await userEvent.click(screen.getByText("edit"));
    await screen.findByText("Keyboard Unlock Required");
    expect(resumed).not.toHaveBeenCalled();

    // Device unlocks -> the parked action runs exactly once, modal closes.
    act(() => setLockState("unlocked"));
    rerender(
      <StudioUnlockProvider>
        <Gate />
      </StudioUnlockProvider>,
    );

    await waitFor(() => expect(resumed).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        screen.queryByText("Keyboard Unlock Required"),
      ).not.toBeInTheDocument(),
    );
  });

  it("runs the action inline (not parked) when already unlocked", async () => {
    mockLockState = "unlocked";
    const resumed = jest.fn();
    function Gate() {
      const { requireUnlock } = useStudioUnlock();
      return (
        <button
          onClick={() => {
            if (!requireUnlock(resumed)) return;
            resumed();
          }}
        >
          edit
        </button>
      );
    }

    render(
      <StudioUnlockProvider>
        <Gate />
      </StudioUnlockProvider>,
    );

    await userEvent.click(screen.getByText("edit"));
    // Runs once, inline — the onUnlocked callback is ignored when unlocked.
    expect(resumed).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText("Keyboard Unlock Required"),
    ).not.toBeInTheDocument();
  });

  it("discards the parked action when the modal is cancelled", async () => {
    const resumed = jest.fn();
    function Gate() {
      const { requireUnlock } = useStudioUnlock();
      return (
        <button
          onClick={() => {
            if (!requireUnlock(resumed)) return;
            resumed();
          }}
        >
          edit
        </button>
      );
    }

    const { rerender } = render(
      <StudioUnlockProvider>
        <Gate />
      </StudioUnlockProvider>,
    );

    await userEvent.click(screen.getByText("edit"));
    await screen.findByText("Keyboard Unlock Required");
    await userEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    await waitFor(() =>
      expect(
        screen.queryByText("Keyboard Unlock Required"),
      ).not.toBeInTheDocument(),
    );

    // A later unlock must not replay the dismissed action.
    act(() => setLockState("unlocked"));
    rerender(
      <StudioUnlockProvider>
        <Gate />
      </StudioUnlockProvider>,
    );
    expect(resumed).not.toHaveBeenCalled();
  });

  it("requireUnlock does not open the modal when unlocked", async () => {
    mockLockState = "unlocked";
    function Gate() {
      const { requireUnlock } = useStudioUnlock();
      return <button onClick={() => requireUnlock()}>gate</button>;
    }

    render(
      <StudioUnlockProvider>
        <Gate />
      </StudioUnlockProvider>,
    );
    await userEvent.click(screen.getByText("gate"));
    expect(
      screen.queryByText("Keyboard Unlock Required"),
    ).not.toBeInTheDocument();
  });

  it("resolves immediately when the request succeeds (no modal)", async () => {
    const onResolve = jest.fn();
    const fn = jest.fn().mockResolvedValue("ok");
    render(
      <StudioUnlockProvider>
        <Harness fn={fn} onResolve={onResolve} onReject={jest.fn()} />
      </StudioUnlockProvider>,
    );

    await userEvent.click(screen.getByText("run"));

    await waitFor(() => expect(onResolve).toHaveBeenCalledWith("ok"));
    expect(
      screen.queryByText("Keyboard Unlock Required"),
    ).not.toBeInTheDocument();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("opens the modal on an unlock error and auto-retries after unlock", async () => {
    const onResolve = jest.fn();
    const fn = jest
      .fn()
      .mockRejectedValueOnce(unlockError())
      .mockResolvedValue("done");

    const { rerender } = render(
      <StudioUnlockProvider>
        <Harness fn={fn} onResolve={onResolve} onReject={jest.fn()} />
      </StudioUnlockProvider>,
    );

    await userEvent.click(screen.getByText("run"));

    // Modal appears; the promise is still pending.
    await screen.findByText("Keyboard Unlock Required");
    expect(onResolve).not.toHaveBeenCalled();

    // Device reports unlocked -> provider auto-retries the same request.
    act(() => setLockState("unlocked"));
    rerender(
      <StudioUnlockProvider>
        <Harness fn={fn} onResolve={onResolve} onReject={jest.fn()} />
      </StudioUnlockProvider>,
    );

    await waitFor(() => expect(onResolve).toHaveBeenCalledWith("done"));
    expect(fn).toHaveBeenCalledTimes(2);
    await waitFor(() =>
      expect(
        screen.queryByText("Keyboard Unlock Required"),
      ).not.toBeInTheDocument(),
    );
  });

  it("retries the request when the Retry button is clicked", async () => {
    const onResolve = jest.fn();
    const fn = jest
      .fn()
      .mockRejectedValueOnce(unlockError())
      .mockResolvedValue("retried");

    render(
      <StudioUnlockProvider>
        <Harness fn={fn} onResolve={onResolve} onReject={jest.fn()} />
      </StudioUnlockProvider>,
    );

    await userEvent.click(screen.getByText("run"));
    await screen.findByText("Keyboard Unlock Required");

    await userEvent.click(screen.getByRole("button", { name: /Retry/i }));

    await waitFor(() => expect(onResolve).toHaveBeenCalledWith("retried"));
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("rejects with StudioUnlockCancelledError when the modal is cancelled", async () => {
    const onReject = jest.fn();
    const fn = jest.fn().mockRejectedValue(unlockError());

    render(
      <StudioUnlockProvider>
        <Harness fn={fn} onResolve={jest.fn()} onReject={onReject} />
      </StudioUnlockProvider>,
    );

    await userEvent.click(screen.getByText("run"));
    await screen.findByText("Keyboard Unlock Required");

    await userEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    await waitFor(() =>
      expect(onReject).toHaveBeenCalledWith(
        expect.any(StudioUnlockCancelledError),
      ),
    );
  });

  it("treats an official response with UNLOCK_REQUIRED meta as an unlock error", async () => {
    const onResolve = jest.fn();
    const lockedResponse = {
      meta: { simpleError: ErrorConditions.UNLOCK_REQUIRED },
    };
    const fn = jest
      .fn()
      .mockResolvedValueOnce(lockedResponse)
      .mockResolvedValue({ ok: true });

    const { rerender } = render(
      <StudioUnlockProvider>
        <Harness fn={fn} onResolve={onResolve} onReject={jest.fn()} />
      </StudioUnlockProvider>,
    );

    await userEvent.click(screen.getByText("run"));
    await screen.findByText("Keyboard Unlock Required");

    act(() => setLockState("unlocked"));
    rerender(
      <StudioUnlockProvider>
        <Harness fn={fn} onResolve={onResolve} onReject={jest.fn()} />
      </StudioUnlockProvider>,
    );

    await waitFor(() => expect(onResolve).toHaveBeenCalledWith({ ok: true }));
  });

  describe("cancel cooldown", () => {
    let user: ReturnType<typeof userEvent.setup>;

    beforeEach(() => {
      jest.useFakeTimers();
      user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const advanceTime = (ms: number) =>
      act(async () => {
        await jest.advanceTimersByTimeAsync(ms);
      });

    it("auto-cancels a follow-up unlock request during the cooldown (no modal)", async () => {
      const onReject2 = jest.fn();
      const fn1 = jest.fn().mockRejectedValue(unlockError());
      const fn2 = jest.fn().mockRejectedValue(unlockError());

      // Wide quiet window so run2 lands well inside the cooldown.
      render(
        <StudioUnlockProvider quietMs={10_000}>
          <Harness fn={fn1} label="run1" />
          <Harness fn={fn2} onReject={onReject2} label="run2" />
        </StudioUnlockProvider>,
      );

      // First request opens the modal; the user cancels it.
      await user.click(screen.getByText("run1"));
      await screen.findByText("Keyboard Unlock Required");
      await user.click(screen.getByRole("button", { name: /Cancel/i }));
      await waitFor(() =>
        expect(
          screen.queryByText("Keyboard Unlock Required"),
        ).not.toBeInTheDocument(),
      );

      // A follow-up unlock request during the cooldown is auto-cancelled: it
      // rejects with StudioUnlockCancelledError and the modal stays closed.
      await user.click(screen.getByText("run2"));
      await waitFor(() =>
        expect(onReject2).toHaveBeenCalledWith(
          expect.any(StudioUnlockCancelledError),
        ),
      );
      expect(
        screen.queryByText("Keyboard Unlock Required"),
      ).not.toBeInTheDocument();
    });

    it("re-opens the modal once requests stay quiet for the window", async () => {
      const fn1 = jest.fn().mockRejectedValue(unlockError());
      const fn2 = jest.fn().mockRejectedValue(unlockError());

      render(
        <StudioUnlockProvider quietMs={30}>
          <Harness fn={fn1} label="run1" />
          <Harness fn={fn2} label="run2" />
        </StudioUnlockProvider>,
      );

      await user.click(screen.getByText("run1"));
      await screen.findByText("Keyboard Unlock Required");
      await user.click(screen.getByRole("button", { name: /Cancel/i }));
      await waitFor(() =>
        expect(
          screen.queryByText("Keyboard Unlock Required"),
        ).not.toBeInTheDocument(),
      );

      // No activity for the full quiet window ends the cooldown, so the
      // next unlock request opens the modal again.
      await advanceTime(30);
      await user.click(screen.getByText("run2"));
      await screen.findByText("Keyboard Unlock Required");
    });

    it("keeps suppressing while a request is still in flight", async () => {
      // A request that never settles keeps inFlight > 0, so the quiet timer
      // never arms and the cooldown persists past the window.
      const pending = new Promise<never>(() => {});
      const slow = jest.fn(() => pending);
      const fn1 = jest.fn().mockRejectedValue(unlockError());
      const fn2 = jest.fn().mockRejectedValue(unlockError());
      const onReject2 = jest.fn();

      render(
        <StudioUnlockProvider quietMs={30}>
          <Harness fn={slow} label="slow" />
          <Harness fn={fn1} label="run1" />
          <Harness fn={fn2} onReject={onReject2} label="run2" />
        </StudioUnlockProvider>,
      );

      // Start a long-running request, then open + cancel the modal.
      await user.click(screen.getByText("slow"));
      await user.click(screen.getByText("run1"));
      await screen.findByText("Keyboard Unlock Required");
      await user.click(screen.getByRole("button", { name: /Cancel/i }));
      await waitFor(() =>
        expect(
          screen.queryByText("Keyboard Unlock Required"),
        ).not.toBeInTheDocument(),
      );

      // Advance beyond the quiet window; because `slow` is still in flight the
      // cooldown must not lapse, so run2 is still auto-cancelled.
      await advanceTime(80);
      await user.click(screen.getByText("run2"));
      await waitFor(() =>
        expect(onReject2).toHaveBeenCalledWith(
          expect.any(StudioUnlockCancelledError),
        ),
      );
      expect(
        screen.queryByText("Keyboard Unlock Required"),
      ).not.toBeInTheDocument();
    });

    it("clears the cooldown when the device is unlocked", async () => {
      const fn1 = jest.fn().mockRejectedValue(unlockError());
      const fn2 = jest.fn().mockRejectedValue(unlockError());
      const tree = (
        <>
          <Harness fn={fn1} label="run1" />
          <Harness fn={fn2} label="run2" />
        </>
      );

      const { rerender } = render(
        <StudioUnlockProvider quietMs={10_000}>{tree}</StudioUnlockProvider>,
      );

      await user.click(screen.getByText("run1"));
      await screen.findByText("Keyboard Unlock Required");
      await user.click(screen.getByRole("button", { name: /Cancel/i }));
      await waitFor(() =>
        expect(
          screen.queryByText("Keyboard Unlock Required"),
        ).not.toBeInTheDocument(),
      );

      // An actual unlock supersedes the recent cancel and clears the cooldown.
      act(() => setLockState("unlocked"));
      rerender(
        <StudioUnlockProvider quietMs={10_000}>{tree}</StudioUnlockProvider>,
      );
      act(() => setLockState("locked"));
      rerender(
        <StudioUnlockProvider quietMs={10_000}>{tree}</StudioUnlockProvider>,
      );

      // The next unlock request opens the modal again (cooldown was cleared).
      await user.click(screen.getByText("run2"));
      await screen.findByText("Keyboard Unlock Required");
    });
  });
});
