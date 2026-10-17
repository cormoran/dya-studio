import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { IconX } from "@tabler/icons-react";
import { useLanguage } from "../../hooks/useLanguage";
import type { ShareReview } from "../../hooks/useKeymapSharing";
import {
  countDiff,
  isEmptyDiff,
  type KeymapDiff,
} from "../../lib/abyss/abyssDiff";
import { isBlocked } from "../../lib/abyss/abyssPreflight";
import { EditorTooltip } from "../EditorTooltip";
import { JsonDiffPanel } from "./JsonDiffModal";
import { KeymapDiffPreview } from "./KeymapDiffPreview";
import { KeymapDiffView } from "./KeymapDiffView";
import type { PreviewPosition } from "./KeymapLayerPreview";

export function KeymapSharingPreview({
  review,
  busy,
  error,
  canSave,
  onClose,
  onDirectionChange,
  onConfirm,
}: {
  review: ShareReview;
  busy: boolean;
  error: string | null;
  canSave: boolean;
  onClose: () => void;
  onDirectionChange: (kind: ShareReview["kind"]) => void;
  onConfirm: () => Promise<unknown>;
}) {
  const { t } = useLanguage();
  const [tab, setTab] = useState("keymap");
  const [layer, setLayer] = useState("all");
  const [confirming, setConfirming] = useState(false);
  const name = review.record?.name ?? review.remote.name ?? t("Keymap");
  const save = review.kind === "save";
  const description = save
    ? t("Compare the Abyss keymap with the keyboard settings to save.")
    : t("Compare the current keyboard with the keymap to apply.");
  const helpApply = t(
    "Replace the keyboard settings with this keymap and save them to the keyboard.",
  );
  const helpSave = t(
    "Update this Abyss keymap with the keyboard's current settings as a new version.",
  );
  const counts = countDiff(review.diff);
  const empty = isEmptyDiff(review.diff);
  const blocked = isBlocked(review.checks);
  const selected = Number(layer);
  const filtered: KeymapDiff =
    layer === "all"
      ? review.diff
      : {
          ...review.diff,
          bindingChanges: review.diff.bindingChanges.filter(
            (c) => c.layerIndex === selected,
          ),
          layerNameChanges: review.diff.layerNameChanges.filter(
            (c) => c.layerIndex === selected,
          ),
          // Global changes remain visible regardless of the selected layer.
          moduleChanges: review.diff.moduleChanges.filter(
            (c) => c.scope === "global" || c.layerIndex === selected,
          ),
        };
  const checks = review.checks.map((check) => (
    <p key={check.id} className="text-xs text-[var(--color-warning)]">
      {t(check.message, check.params)}
    </p>
  ));
  return (
    <>
      <Dialog.Root
        open
        onOpenChange={(open) => {
          if (!open && !busy && !confirming) onClose();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="diff-sheet fixed left-0 top-0 w-screen h-dvh max-w-none z-50 flex flex-col glass-card p-0 overflow-hidden tablet:top-1/2 tablet:left-1/2 tablet:-translate-x-1/2 tablet:-translate-y-1/2 tablet:w-[95vw] tablet:h-[90vh] tablet:max-w-6xl tablet:rounded-xl">
            <div className="shrink-0 flex items-start gap-3 p-3 tablet:p-4 border-b border-[var(--color-border)]">
              <div className="flex-1 min-w-0">
                <Dialog.Title className="text-base font-medium break-words">
                  {t("Preview {{name}}", { name })}
                </Dialog.Title>
                <Dialog.Description className="text-xs text-[var(--color-text-muted)]">
                  {description}
                </Dialog.Description>
              </div>
              <button
                className="btn-ghost p-1.5 shrink-0"
                aria-label={t("Close")}
                disabled={busy}
                onClick={onClose}
              >
                <IconX size={16} />
              </button>
            </div>
            <Tabs.Root
              value={tab}
              onValueChange={setTab}
              className="flex flex-col flex-1 min-h-0 min-w-0"
            >
              {canSave && (
                <Tabs.Root
                  value={review.kind}
                  onValueChange={(kind) =>
                    onDirectionChange(kind as ShareReview["kind"])
                  }
                  className="shrink-0 p-3 border-b border-[var(--color-border)]"
                >
                  <Tabs.List
                    aria-label={t("Preview direction")}
                    className="flex flex-wrap gap-1"
                  >
                    {(["apply", "save"] as const).map((kind) => (
                      <Tabs.Trigger
                        key={kind}
                        value={kind}
                        disabled={busy}
                        className="px-3 py-2 rounded-lg border border-transparent text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] data-[state=active]:border-[var(--color-electric)] data-[state=active]:text-[var(--color-electric)] data-[state=active]:bg-[var(--color-electric)]/10"
                      >
                        {t(
                          kind === "apply"
                            ? "Apply from Abyss to keyboard"
                            : "Upload from keyboard to Abyss",
                        )}
                      </Tabs.Trigger>
                    ))}
                  </Tabs.List>
                </Tabs.Root>
              )}
              <div className="shrink-0 px-3 py-2 border-b border-[var(--color-border)]">
                <Tabs.List
                  aria-label={t("Preview format")}
                  className="flex gap-1"
                >
                  <Tabs.Trigger
                    value="keymap"
                    className="px-2.5 py-1 rounded-lg border border-transparent text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] data-[state=active]:border-[var(--color-electric)] data-[state=active]:text-[var(--color-electric)] data-[state=active]:bg-[var(--color-electric)]/10"
                  >
                    {t("Keymap preview")}
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="code"
                    className="px-2.5 py-1 rounded-lg border border-transparent text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] data-[state=active]:border-[var(--color-electric)] data-[state=active]:text-[var(--color-electric)] data-[state=active]:bg-[var(--color-electric)]/10"
                  >
                    {t("Code diff")}
                  </Tabs.Trigger>
                </Tabs.List>
              </div>
              <Tabs.Content
                value="keymap"
                className="flex-1 min-h-0 overflow-auto p-3 tablet:p-4 space-y-5"
              >
                <KeymapDiffPreview
                  positions={
                    (
                      review.loaded.state.detectedLayout as
                        | { positions?: PreviewPosition[] }
                        | undefined
                    )?.positions ?? []
                  }
                  layers={review.after.layers}
                  diff={review.diff}
                />
                <section
                  aria-label={t("Changes")}
                  className="space-y-3 border-t border-[var(--color-border)] pt-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h3 className="text-sm font-medium shrink-0">
                      {t("Changes")}
                    </h3>
                    <label className="text-xs flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="shrink-0">
                        {t("Filter changes by layer")}
                      </span>
                      <select
                        className="input-field text-xs min-w-0 max-w-full"
                        value={layer}
                        onChange={(e) => setLayer(e.target.value)}
                      >
                        <option value="all">{t("All layers")}</option>
                        {Array.from(
                          {
                            length: Math.max(
                              review.before.layers.length,
                              review.after.layers.length,
                            ),
                          },
                          (_, index) => (
                            <option key={index} value={index}>
                              {review.after.layers[index]?.name ??
                                review.before.layers[index]?.name ??
                                t("Layer {{index}}", { index })}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                  {empty ? (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {t("No differences.")}
                    </p>
                  ) : (
                    <KeymapDiffView
                      key={`${review.kind}:${layer}`}
                      diff={filtered}
                      defaultExpanded
                    />
                  )}
                </section>
              </Tabs.Content>
              <Tabs.Content
                value="code"
                className="flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col"
              >
                <p className="px-3 pt-2 text-xs text-[var(--color-text-muted)]">
                  {save
                    ? t(
                        "Left: the keymap currently on Abyss. Right: what this export would save.",
                      )
                    : t(
                        "Left: what is on the keyboard now. Right: the keymap to apply.",
                      )}
                </p>
                <JsonDiffPanel
                  before={review.before}
                  after={review.after}
                  active={tab === "code"}
                />
              </Tabs.Content>
            </Tabs.Root>
            <div className="shrink-0 p-3 border-t border-[var(--color-border)] space-y-2">
              {checks}
              {error && (
                <p role="alert" className="text-xs text-[var(--color-danger)]">
                  {t(error)}
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  className="btn-ghost text-sm"
                  disabled={busy}
                  onClick={onClose}
                >
                  {t("Close")}
                </button>
                <EditorTooltip content={save ? helpSave : helpApply}>
                  <button
                    className="btn-electric text-sm"
                    disabled={
                      busy || blocked || (empty && (save || !review.record))
                    }
                    onClick={() => setConfirming(true)}
                  >
                    {save ? t("Update Abyss keymap") : t("Apply to keyboard")}
                  </button>
                </EditorTooltip>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={confirming}
        onOpenChange={(open) => {
          if (!busy) setConfirming(open);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/60" />
          <Dialog.Content className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glass-card p-5 w-[min(30rem,calc(100vw-2rem))] max-h-[90dvh] overflow-y-auto space-y-4">
            <Dialog.Title className="text-base font-medium">
              {save
                ? t("Save to {{name}}", { name })
                : t("Apply {{name}}", { name })}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-[var(--color-text-muted)]">
              {save ? helpSave : helpApply}
            </Dialog.Description>
            <p className="text-sm">
              {t("{{count}} changes", { count: counts.total })}
            </p>
            {!save && (
              <p className="text-xs text-[var(--color-text-muted)]">
                {t(
                  "Applying writes and saves to the keyboard immediately. Partial failures may leave mixed settings.",
                )}
              </p>
            )}
            {checks}
            {error && (
              <p role="alert" className="text-xs text-[var(--color-danger)]">
                {t(error)}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Dialog.Close className="btn-ghost text-sm" disabled={busy}>
                {t("Cancel")}
              </Dialog.Close>
              <button
                className="btn-electric text-sm"
                disabled={
                  busy || blocked || (empty && (save || !review.record))
                }
                onClick={() => void onConfirm()}
              >
                {save ? t("Save to Abyss") : t("Apply to keyboard")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
