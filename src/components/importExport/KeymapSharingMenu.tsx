import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import * as Popover from "@radix-ui/react-popover";
import * as Dialog from "@radix-ui/react-dialog";
import {
  IconArrowLeft,
  IconArrowRight,
  IconChevronDown,
  IconCloud,
  IconLoader2,
  IconLogout,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { useLanguage } from "../../hooks/useLanguage";
import { useAbyssAuth } from "../../hooks/useAbyssAuth";
import { useKeymapSharing } from "../../hooks/useKeymapSharing";
import { useAbyssBrowseUrl } from "../../hooks/useAbyssBrowseUrl";
import { KeymapSharingPreview } from "./KeymapSharingPreview";
import { KeymapApplyResultModal } from "./KeymapApplyResultModal";
import abyssIcon from "../../assets/keyboard-abyss.svg";
import { ResponsiveButton } from "../ResponsiveButton";

const mobileQuery = "(max-width: 639px)";
function subscribeToMobile(onChange: () => void) {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
function isMobileViewport() {
  return window.matchMedia(mobileQuery).matches;
}

export function KeymapSharingMenu({
  disabled,
  onApplied,
  beforeRead,
  keyboardRevision,
}: {
  disabled?: boolean;
  onApplied: () => Promise<unknown>;
  beforeRead?: () => Promise<void>;
  keyboardRevision?: string;
}) {
  const { t } = useLanguage();
  const auth = useAbyssAuth();
  const sharing = useKeymapSharing(
    auth.isAuthenticated,
    onApplied,
    auth.logout,
    beforeRead,
    auth.user?.username,
    keyboardRevision,
  );
  const [open, setOpen] = useState(false);
  const mobile = useSyncExternalStore(
    subscribeToMobile,
    isMobileViewport,
    () => false,
  );
  const MenuRoot = mobile ? Dialog.Root : Popover.Root;
  const MenuTrigger = mobile ? Dialog.Trigger : Popover.Trigger;
  const MenuPortal = mobile ? Dialog.Portal : Popover.Portal;
  const MenuContent = mobile ? Dialog.Content : Popover.Content;
  const browseUrl = useAbyssBrowseUrl(open);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const file = useRef<HTMLInputElement>(null);
  const busy = sharing.busy || Boolean(disabled);
  const review = sharing.review;
  const error = sharing.error ?? auth.error;
  const refreshOnOpen = useEffectEvent(() => {
    void sharing.refresh(false);
  });
  useEffect(() => {
    if (open && auth.isAuthenticated) refreshOnOpen();
  }, [open, auth.isAuthenticated]);

  return (
    <>
      <MenuRoot
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
        }}
      >
        <MenuTrigger asChild>
          <ResponsiveButton
            label={t("Save/share keymap")}
            title={t("Manage your keymaps in the cloud with Keyboard Abyss")}
            className="btn-ghost border border-[var(--color-border)] text-sm flex items-center gap-1.5"
            disabled={disabled}
            trailingIcon={<IconChevronDown size={12} />}
          >
            <IconCloud size={16} />
          </ResponsiveButton>
        </MenuTrigger>
        {mobile && (
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          </Dialog.Portal>
        )}
        <MenuPortal>
          <MenuContent
            {...(!mobile
              ? { align: "end" as const, sideOffset: 8 }
              : { "aria-describedby": undefined })}
            className={
              mobile
                ? "keymap-sharing-menu fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glass-card w-[calc(100%-2rem)] max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-3 space-y-3 shadow-xl text-[var(--color-text)] break-words"
                : "keymap-sharing-menu z-40 glass-card w-[min(25rem,calc(100vw-1rem))] max-h-[min(38rem,var(--radix-popover-content-available-height))] overflow-y-auto p-3 space-y-3 shadow-xl text-[var(--color-text)]"
            }
            aria-label={t("Save/share keymap")}
          >
            {mobile && (
              <div className="flex items-center justify-between gap-2">
                <Dialog.Title className="text-base font-medium">
                  {t("Save/share keymap")}
                </Dialog.Title>
                <Dialog.Close
                  className="btn-ghost min-w-11 min-h-11 shrink-0 flex items-center justify-center"
                  aria-label={t("Close")}
                >
                  <IconX size={20} />
                </Dialog.Close>
              </div>
            )}
            {auth.isAuthenticated ? (
              <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
                {auth.user?.avatarUrl ? (
                  <img
                    src={auth.user.avatarUrl}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <IconCloud size={24} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate">
                    {auth.user?.displayName ?? auth.user?.username}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] truncate">
                    @{auth.user?.username}
                  </div>
                </div>
                <button
                  className="btn-ghost p-1.5 text-[var(--color-text-muted)]"
                  aria-label={t("Sign out")}
                  title={t("Sign out")}
                  disabled={busy || auth.isLoading}
                  onClick={() => void auth.logout()}
                >
                  <IconLogout size={16} />
                </button>
              </div>
            ) : (
              <div>
                <button
                  className="btn-electric w-full text-sm flex items-center justify-center gap-2"
                  disabled={!auth.isConfigured || auth.isLoading}
                  onClick={() => void auth.login()}
                >
                  <img src={abyssIcon} alt="" className="h-5 w-5" />
                  {t("Sign in with Abyss")}
                </button>
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  {t(
                    "Keyboard Abyss is a keymap sharing service developed by @cormoran707, the developer of DYA Studio.",
                  )}
                </p>
                {!auth.isConfigured && (
                  <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                    {t(
                      "Abyss sign-in is unavailable because this build has no OAuth client configuration.",
                    )}
                  </p>
                )}
              </div>
            )}
            {auth.isAuthenticated && (
              <>
                <section aria-label={t("Current keymap")}>
                  <h3 className="text-xs text-[var(--color-text-muted)] mb-1">
                    {t("Current keymap")}
                  </h3>
                  {sharing.current ? (
                    <div className="border-t border-[var(--color-border)] py-2 space-y-2">
                      <button
                        className="btn-ghost w-full text-left flex items-center justify-between gap-2"
                        disabled={busy}
                        onClick={() =>
                          void sharing.prepare("apply", sharing.current!)
                        }
                      >
                        <span className="text-sm break-words min-w-0">
                          {sharing.current.name}
                        </span>
                        <span
                          role="status"
                          className="text-xs text-[var(--color-text-muted)] shrink-0"
                        >
                          {t(
                            sharing.checking
                              ? "Checking differences..."
                              : sharing.changed
                                ? "Differences found"
                                : "In sync",
                          )}
                        </span>
                      </button>
                      <div className="flex flex-wrap gap-2">
                        {sharing.keymaps.some(
                          (item) => item.id === sharing.current?.id,
                        ) && (
                          <button
                            className="btn-ghost flex-1 inline-flex items-center justify-center gap-1"
                            disabled={busy}
                            onClick={() =>
                              void sharing.prepare("save", sharing.current!)
                            }
                          >
                            <IconArrowRight
                              size={12}
                              aria-hidden="true"
                              className="shrink-0"
                            />
                            <span className="text-[11px] leading-4">
                              {t("Sync to Abyss")}
                            </span>
                          </button>
                        )}
                        {sharing.changed && (
                          <button
                            className="btn-ghost flex-1 inline-flex items-center justify-center gap-1"
                            disabled={busy}
                            onClick={() =>
                              void sharing.prepare("apply", sharing.current!)
                            }
                          >
                            <span className="text-[11px] leading-4">
                              {t("Overwrite from Abyss")}
                            </span>
                            <IconArrowLeft
                              size={12}
                              aria-hidden="true"
                              className="shrink-0"
                            />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {t(
                        sharing.identity === "unsupported"
                          ? "This keyboard cannot identify its current keymap. Keymap identity RPC is not supported."
                          : sharing.identity === "unset"
                            ? "No keymap identity is stored on this keyboard."
                            : "The current keymap could not be identified.",
                      )}
                    </p>
                  )}
                </section>
                <section
                  aria-label={t("Your keymaps")}
                  className="border-t border-[var(--color-border)] pt-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs text-[var(--color-text-muted)]">
                      {t("Your keymaps")}
                    </h3>
                    <button
                      className="btn-ghost p-1.5"
                      aria-label={t("Refresh your keymaps")}
                      title={t("Refresh your keymaps")}
                      disabled={busy}
                      onClick={() => void sharing.refresh()}
                    >
                      <IconRefresh
                        size={15}
                        className={sharing.busy ? "animate-spin" : undefined}
                      />
                    </button>
                  </div>
                  {sharing.keymaps.length === 0 && !sharing.busy && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-2">
                      {t("No keymaps for this keyboard.")}
                    </p>
                  )}
                  <ul className="max-h-52 overflow-y-auto">
                    {sharing.keymaps
                      .filter((item) => item.id !== sharing.current?.id)
                      .map((item) => (
                        <li key={item.id}>
                          <button
                            className="btn-ghost flex items-center justify-between gap-2 w-full text-left text-sm"
                            disabled={busy}
                            onClick={() => void sharing.prepare("apply", item)}
                          >
                            <span className="min-w-0 break-words">
                              {item.name}
                            </span>
                            {item.visibility === "public" && (
                              <span className="shrink-0 rounded border border-[var(--color-border)] px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]">
                                public
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                  </ul>
                </section>
              </>
            )}
            <div className="border-t border-[var(--color-border)] pt-2 space-y-1">
              <a
                className="btn-ghost block text-sm"
                href={browseUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("Find on Abyss")} ↗
              </a>
              {auth.isAuthenticated && (
                <button
                  className="btn-ghost block w-full text-left text-sm"
                  disabled={busy}
                  onClick={() => {
                    setCreating(true);
                    setName("");
                    setVisibility("private");
                  }}
                >
                  {t("Save new to Abyss")}
                </button>
              )}
            </div>
            <div className="border-t border-[var(--color-border)] pt-2 space-y-1">
              <button
                className="btn-ghost block w-full text-left text-sm"
                disabled={busy}
                onClick={() => void sharing.saveFile()}
              >
                {t("Save to file")}
              </button>
              <button
                className="btn-ghost block w-full text-left text-sm"
                disabled={busy}
                onClick={() => file.current?.click()}
              >
                {t("Apply from file")}
              </button>
            </div>
            {sharing.busy && (
              <p role="status" className="text-xs flex items-center gap-2">
                <IconLoader2
                  size={14}
                  className="animate-spin shrink-0"
                  aria-hidden="true"
                />
                {t(sharing.checking ? "Checking differences..." : "Loading...")}
              </p>
            )}
            {sharing.message && (
              <p role="status" className="text-xs text-[var(--color-success)]">
                {t(sharing.message)}
              </p>
            )}
            {sharing.savedKeymapUrl && (
              <a
                className="btn-ghost text-xs inline-flex"
                href={sharing.savedKeymapUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("Open on Abyss")}
              </a>
            )}
            {error && !review && !creating && (
              <p role="alert" className="text-xs text-[var(--color-danger)]">
                {t(error)}
              </p>
            )}
          </MenuContent>
        </MenuPortal>
      </MenuRoot>
      <input
        ref={file}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-label={t("Apply from file")}
        onChange={(event) => {
          const selected = event.target.files?.[0];
          event.target.value = "";
          if (!selected) return;
          if (selected.size > 5 * 1024 * 1024) {
            sharing.fileError("The keymap file is too large (maximum 5 MB).");
            return;
          }
          void selected
            .text()
            .then((text) => {
              const data: unknown = JSON.parse(text);
              return sharing.prepare("apply", undefined, data);
            })
            .catch(() =>
              sharing.fileError("This file is not a valid KeyboardHub keymap."),
            );
        }}
      />
      {review && (
        <KeymapSharingPreview
          review={review}
          busy={busy}
          error={error}
          canSave={
            auth.isAuthenticated &&
            sharing.keymaps.some((item) => item.id === review.record?.id)
          }
          onClose={() => sharing.setReview(null)}
          onDirectionChange={sharing.selectDirection}
          onSelectionChange={sharing.selectParts}
          onConfirm={sharing.confirm}
        />
      )}
      {sharing.applyResult && (
        <KeymapApplyResultModal
          result={sharing.applyResult}
          onClose={() => sharing.setApplyResult(null)}
        />
      )}
      <Dialog.Root
        open={creating && auth.isAuthenticated}
        onOpenChange={(value) => {
          if (!sharing.busy) setCreating(value);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glass-card p-5 w-[min(26rem,calc(100vw-2rem))] space-y-4">
            <Dialog.Title className="text-base font-medium">
              {t("Save new to Abyss")}
            </Dialog.Title>
            <Dialog.Description className="text-xs text-[var(--color-text-muted)]">
              {t("Save the keyboard's current settings as a new Abyss keymap.")}
            </Dialog.Description>
            <label className="block text-sm">
              {t("Keymap name")}
              <input
                className="input-field w-full mt-1"
                value={name}
                disabled={sharing.busy}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              {t("Visibility")}
              <select
                className="input-field w-full mt-1"
                value={visibility}
                disabled={sharing.busy}
                onChange={(e) =>
                  setVisibility(e.target.value as typeof visibility)
                }
              >
                <option value="private">{t("Private — only you")}</option>
                <option value="public">
                  {t("Public — anyone can find it")}
                </option>
              </select>
            </label>
            {error && (
              <p role="alert" className="text-xs text-[var(--color-danger)]">
                {t(error)}
              </p>
            )}
            {sharing.message && (
              <p role="status" className="text-xs">
                {t(sharing.message)}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Dialog.Close className="btn-ghost" disabled={sharing.busy}>
                {t("Close")}
              </Dialog.Close>
              <button
                className="btn-electric"
                disabled={busy || !name.trim()}
                onClick={() =>
                  void sharing.create(name, visibility).then((success) => {
                    if (success) setCreating(false);
                  })
                }
              >
                {t("Save to Abyss")}
              </button>
            </div>
            <Dialog.Close
              className="absolute top-2 right-2 btn-ghost p-1"
              aria-label={t("Close")}
              disabled={sharing.busy}
            >
              <IconX size={16} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
