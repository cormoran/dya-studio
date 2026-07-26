/**
 * Shared Studio-unlock primitives.
 *
 * A ZMK Studio "unlock required" condition can surface in three different
 * shapes depending on which transport path a request took:
 *
 *  1. A thrown {@link import("@zmkfirmware/zmk-studio-ts-client").MetaError}
 *     from `call_rpc` (custom subsystems and official mutations) — detected by
 *     the library's {@link isUnlockRequiredError}.
 *  2. A returned official-protocol response carrying
 *     `meta.simpleError === ErrorConditions.UNLOCK_REQUIRED` (the official read
 *     path resolves rather than throws).
 *  3. The app-level {@link KeymapUnlockRequiredError} raised by the fast-keymap
 *     load path.
 *
 * {@link isStudioUnlockError} collapses all three into one predicate so the
 * central unlock gate ({@link import("../contexts/StudioUnlockContext")}) can
 * treat "the keyboard is locked" uniformly, no matter which feature produced
 * the failure.
 */
import { isUnlockRequiredError } from "@cormoran/zmk-studio-react-hook";
import { ErrorConditions } from "@zmkfirmware/zmk-studio-ts-client/meta";

/**
 * User-facing message shown when an operation fails because the device is
 * locked in ZMK Studio. This exact string is the i18n key (see the `ja`
 * dictionary in `src/i18n/translations.ts`); render it through `t()`.
 */
export const STUDIO_LOCKED_MESSAGE =
  "The operation failed because the device is locked in ZMK Studio. Unlock the keyboard and try again.";

/**
 * Thrown when a keymap load fails because the keyboard is locked. Lives here
 * (rather than in `useKeymapSource`) so {@link isStudioUnlockError} can
 * recognize it without a circular import; re-exported from `useKeymapSource`
 * for existing callers.
 */
export class KeymapUnlockRequiredError extends Error {
  constructor() {
    super("Keyboard needs to be unlocked");
    this.name = "KeymapUnlockRequiredError";
  }
}

/**
 * Rejection raised by the unlock gate when a request cannot proceed because the
 * device is locked and the user did not unlock it — i.e. they dismissed the
 * unlock modal, or the request arrived during the post-cancel cooldown. Its
 * message is the shared {@link STUDIO_LOCKED_MESSAGE} i18n key, so a feature
 * that surfaces `err.message` already shows the clear "device is locked" text
 * (rendered through `t()`) instead of a subsystem-specific error.
 */
export class StudioUnlockCancelledError extends Error {
  constructor() {
    super(STUDIO_LOCKED_MESSAGE);
    this.name = "StudioUnlockCancelledError";
  }
}

/** True when `err` means "the keyboard is locked" — from either protocol. */
export function isKeymapUnlockRequired(err: unknown): boolean {
  return err instanceof KeymapUnlockRequiredError || isUnlockRequiredError(err);
}

/**
 * True when `x` represents a "keyboard is locked" condition, whether it is a
 * thrown error (`MetaError` / {@link KeymapUnlockRequiredError}) or a returned
 * response object with `meta.simpleError === UNLOCK_REQUIRED`.
 */
export function isStudioUnlockError(x: unknown): boolean {
  if (isKeymapUnlockRequired(x)) {
    return true;
  }
  if (x !== null && typeof x === "object") {
    // Duck-type a thrown `MetaError` by its `condition` field instead of relying
    // on `instanceof MetaError`. Under a strict/pnpm node_modules layout the app
    // and the react-hook can resolve to different copies of the ts-client
    // package, so the library's `isUnlockRequiredError` (an `instanceof` check)
    // may miss the error the transport actually threw. Missing it means the gate
    // rejects instead of parking, and the tab retries the load in a tight loop.
    if (
      (x as { condition?: number }).condition ===
      ErrorConditions.UNLOCK_REQUIRED
    ) {
      return true;
    }
    // Official-protocol responses resolve (rather than throw) with the unlock
    // condition tucked into `meta.simpleError`.
    const meta = (x as { meta?: { simpleError?: number } }).meta;
    if (meta?.simpleError === ErrorConditions.UNLOCK_REQUIRED) {
      return true;
    }
    // The Abyss ZMK adapter reports a locked device with its own
    // `FirmwareLockedError`. Matched by shape rather than imported, both to keep
    // this module dependency-free and because the adapter's own
    // `isFirmwareLockedError` also matches any message merely containing
    // "locked" — too loose to route into the unlock modal.
    const named = x as { code?: unknown; name?: unknown };
    if (named.code === "LOCKED" || named.name === "FirmwareLockedError") {
      return true;
    }
  }
  return false;
}

/**
 * If `err` means "the device is locked" — either the gate's
 * {@link StudioUnlockCancelledError} or a raw unlock error that slipped past the
 * gate — return the shared {@link STUDIO_LOCKED_MESSAGE} i18n key; otherwise
 * `null` so the caller can fall back to its own error text. Callers set this as
 * their error string and render it through `t()`.
 */
export function studioLockErrorText(err: unknown): string | null {
  if (err instanceof StudioUnlockCancelledError || isStudioUnlockError(err)) {
    return STUDIO_LOCKED_MESSAGE;
  }
  return null;
}
