/**
 * Checkboxes for which parts of the keymap an export or import covers.
 *
 * Mirrors the section selection Keyboard Abyss offers in its own writeback UI,
 * so the same keymap moves the same way from either direction.
 */
import { useLanguage } from "../../hooks/useLanguage";
import {
  SECTION_IDS,
  type AbyssSectionId,
  type AbyssSectionSelection,
} from "../../lib/abyss/abyssExportPayload";

const SECTION_LABELS: Record<AbyssSectionId, string> = {
  keymap: "Keymap (layers & key bindings)",
  combos: "Combos",
  macros: "Macros",
  modules: "Module settings",
};

export function DataSectionSelector({
  selection,
  onChange,
  /** Section ids that cannot be toggled, with the reason shown as a hint. */
  disabled = {},
  /** Sections forced on regardless of `selection`, e.g. keymap for a new keymap. */
  forced = [],
}: {
  selection: AbyssSectionSelection;
  onChange: (selection: AbyssSectionSelection) => void;
  disabled?: Partial<Record<AbyssSectionId, string>>;
  forced?: AbyssSectionId[];
}) {
  const { t } = useLanguage();

  return (
    <fieldset className="mb-4">
      <legend className="text-xs text-[var(--color-text-muted)] mb-2">
        {t("Include")}
      </legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {SECTION_IDS.map((id) => {
          const isForced = forced.includes(id);
          const disabledReason = disabled[id];
          return (
            <label
              key={id}
              className={`flex items-center gap-2 text-sm ${
                disabledReason
                  ? "text-[var(--color-text-muted)] cursor-not-allowed"
                  : "text-[var(--color-text)] cursor-pointer"
              }`}
              title={disabledReason ? t(disabledReason) : undefined}
            >
              <input
                type="checkbox"
                className="accent-[var(--color-electric)]"
                checked={isForced || (selection[id] && !disabledReason)}
                disabled={isForced || Boolean(disabledReason)}
                onChange={(event) =>
                  onChange({ ...selection, [id]: event.target.checked })
                }
              />
              {t(SECTION_LABELS[id])}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
