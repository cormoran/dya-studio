import { useEffect, useEffectEvent, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import * as Dialog from "@radix-ui/react-dialog";
import {
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
import abyssIcon from "../../assets/keyboard-abyss.svg";
import { ResponsiveButton } from "../ResponsiveButton";

export function KeymapSharingMenu({
  disabled,
  onApplied,
  beforeRead,
}: {
  disabled?: boolean;
  onApplied: () => Promise<unknown>;
  beforeRead?: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const auth = useAbyssAuth();
  const sharing = useKeymapSharing(
    auth.isAuthenticated,
    onApplied,
    auth.logout,
    beforeRead,
    auth.user?.username,
  );
  const [open, setOpen] = useState(false);
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
      <Popover.Root
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
        }}
      >
        <Popover.Trigger asChild>
          <ResponsiveButton
            label={t("Save/share keymap")}
            title={t("Manage your keymaps in the cloud with Keyboard Abyss")}
            className="btn-ghost border border-[var(--color-border)] text-sm flex items-center gap-1.5"
            disabled={disabled}
            trailingIcon={<IconChevronDown size={12} />}
          >
            <IconCloud size={16} />
          </ResponsiveButton>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={8}
            className="z-40 glass-card w-[min(25rem,calc(100vw-1rem))] max-h-[min(38rem,var(--radix-popover-content-available-height))] overflow-y-auto p-3 space-y-3 shadow-xl text-[var(--color-text)]"
            aria-label={t("Save/share keymap")}
          >
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
                      {!sharing.changed && (
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {t("In sync")}
                        </span>
                      )}
                    </button>
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
                {t("Loading...")}
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
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
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
