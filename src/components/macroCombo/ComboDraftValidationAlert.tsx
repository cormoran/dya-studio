import { IconAlertTriangle } from "@tabler/icons-react";
import { useLanguage } from "../../hooks/useLanguage";

/** Also shown by Keymap when its selected draft's editor is closed. */
export function ComboDraftValidationAlert({ error }: { error: string }) {
  const { t } = useLanguage();
  return (
    <div
      role="alert"
      className="mb-4 p-3 rounded-lg border warning-banner text-sm flex items-center gap-2"
    >
      <IconAlertTriangle size={16} className="shrink-0" />
      <div>
        <p>{error}</p>
        <p>
          {t(
            "This combo draft has not been applied or saved. Fix it before saving.",
          )}
        </p>
      </div>
    </div>
  );
}
