/**
 * Full-screen JSON diff, opened before committing a keymap change.
 *
 * Mirrors Keyboard Abyss's diff editor so the same keymap reads the same way on
 * both sides: inline or side-by-side, and either a few lines of context around
 * each change or the whole document.
 *
 * Rendering is deferred until the dialog is actually open — a keymap is tens of
 * thousands of characters, and diffing two of them on every parent render would
 * be paid by everyone who never opens it.
 */
import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { IconX } from "@tabler/icons-react";
import { Diff, Hunk, type FileData } from "react-diff-view";
import "react-diff-view/style/index.css";
import { useLanguage } from "../../hooks/useLanguage";
import {
  buildJsonDiff,
  toDiffJson,
  type DiffViewMode,
} from "../../lib/abyss/jsonDiff";

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--color-border)] overflow-hidden">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`px-3 py-1.5 text-xs transition-colors ${
            value === option.value
              ? "bg-[var(--color-electric)]/15 text-[var(--color-electric)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function DiffBody({
  files,
  viewMode,
}: {
  files: FileData[];
  viewMode: DiffViewMode;
}) {
  return (
    <>
      {files.map((file, index) => (
        <Diff
          key={file.newPath ?? index}
          diffType={file.type}
          hunks={file.hunks}
          viewType={viewMode}
        >
          {(hunks) =>
            hunks.map((hunk) => <Hunk hunk={hunk} key={hunk.content} />)
          }
        </Diff>
      ))}
    </>
  );
}

export function JsonDiffModal({
  open,
  onOpenChange,
  title,
  description,
  before,
  after,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** What the two sides mean, so nobody has to guess which is which. */
  description: string;
  before: unknown;
  after: unknown;
}) {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<DiffViewMode>("unified");
  const [showEntireFile, setShowEntireFile] = useState(false);

  const diff = useMemo(() => {
    if (!open) return null;
    return buildJsonDiff(toDiffJson(before), toDiffJson(after));
  }, [open, before, after]);

  const files = diff
    ? showEntireFile
      ? diff.expandedFiles
      : diff.collapsedFiles
    : [];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] h-[90vh] max-w-6xl z-50 flex flex-col glass-card p-0 overflow-hidden">
          <div className="flex items-start gap-3 p-4 border-b border-[var(--color-border)]">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-sm font-medium text-[var(--color-text)]">
                {title}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-[var(--color-text-muted)]">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="btn-ghost p-1.5 flex-shrink-0"
              aria-label={t("Close")}
            >
              <IconX size={16} />
            </Dialog.Close>
          </div>

          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
            <SegmentedControl
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: "unified", label: t("Inline") },
                { value: "split", label: t("Side by side") },
              ]}
            />
            {diff?.hasHiddenContext && (
              <SegmentedControl
                value={showEntireFile ? "all" : "around"}
                onChange={(value) => setShowEntireFile(value === "all")}
                options={[
                  { value: "around", label: t("Around changes") },
                  { value: "all", label: t("Entire file") },
                ]}
              />
            )}
          </div>

          <div className="flex-1 overflow-auto p-4 text-xs abyss-diff">
            {diff && !diff.hasChanges ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                {t("No differences.")}
              </p>
            ) : (
              <DiffBody files={files} viewMode={viewMode} />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
