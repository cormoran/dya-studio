import { EditorTooltip } from "./EditorTooltip";
import { IconInfoCircle } from "@tabler/icons-react";
import { useLanguage } from "../hooks/useLanguage";

interface InfoTipProps {
  /** Tooltip body text (already translated). */
  text: string;
}

/**
 * Small info icon that reveals a short explanation on hover/focus.
 * Used next to labels that need a denser explanation than a caption.
 */
export function InfoTip({ text }: InfoTipProps) {
  const { t } = useLanguage();
  return (
    <EditorTooltip tapToOpen content={<>{text}</>}>
      <button
        type="button"
        className="inline-flex items-center p-px opacity-60 hover:opacity-100 transition-opacity cursor-pointer align-middle"
        aria-label={t("More info")}
      >
        <IconInfoCircle size={14} />
      </button>
    </EditorTooltip>
  );
}
