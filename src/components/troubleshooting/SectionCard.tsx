import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  IconAlertTriangleFilled,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-react";
import { useLanguage } from "../../hooks/useLanguage";

interface SectionCardProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Compact status badge rendered in the header at all times, even when
   * collapsed, so a collapsed section still communicates health. */
  summary?: ReactNode;
  /** Whether the section starts expanded. Defaults to false — sections
   * contain a lot of detail, so they start collapsed and users open only
   * what they need. */
  defaultOpen?: boolean;
  /** Called once, the first time the section is open (including immediately
   * on mount if `defaultOpen` is true). Used for lazily fetching heavier
   * data on first expand. */
  onExpand?: () => void;
}

export function SectionCard({
  icon,
  title,
  subtitle,
  actions,
  children,
  summary,
  defaultOpen = false,
  onExpand,
}: SectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hasFiredExpand = useRef(false);

  useEffect(() => {
    if (open && !hasFiredExpand.current) {
      hasFiredExpand.current = true;
      onExpand?.();
    }
    // Only fire once per (real) expand transition, not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = () => setOpen((v) => !v);

  return (
    <div className="glass-card p-4 sm:p-6">
      <div
        role="button"
        tabIndex={0}
        className="w-full flex flex-col tablet:flex-row tablet:items-center gap-3 mb-0 text-left cursor-pointer"
        aria-expanded={open}
        aria-label={title}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {open ? (
            <IconChevronDown
              size={16}
              className="text-[var(--color-text-muted)] flex-shrink-0"
            />
          ) : (
            <IconChevronRight
              size={16}
              className="text-[var(--color-text-muted)] flex-shrink-0"
            />
          )}
          <div className="shrink-0 p-2 rounded-lg bg-[var(--color-electric)]/10 border border-[var(--color-electric)]/20">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-medium text-[var(--color-text)]">
                {title}
              </h2>
              {summary}
            </div>
            {subtitle && (
              <p className="text-xs text-[var(--color-text-muted)]">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div
            className="flex items-center gap-2 ml-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

interface NotAvailableNoticeProps {
  module: string;
  moduleUrl: string;
}

export function NotAvailableNotice({
  module,
  moduleUrl,
}: NotAvailableNoticeProps) {
  const { t } = useLanguage();
  return (
    <div className="p-4 rounded-lg bg-[var(--color-border)] border border-[var(--color-border-hover)] flex items-start gap-3">
      <div className="p-1">
        <IconAlertTriangleFilled
          size={20}
          className="text-[var(--color-text-muted)]"
        />
      </div>
      <p className="text-sm text-[var(--color-text-muted)]">
        <span>{t("Not available on this keyboard.")}</span>
        <br />
        {t("Make sure your firmware has the {{module}} enabled.", {
          module,
        })}
        <a
          href={moduleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-electric)] underline mx-1"
        >
          {module}
        </a>
      </p>
    </div>
  );
}

export function SectionError({ message }: { message: string }) {
  const { t } = useLanguage();
  return (
    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
      <p className="text-sm text-red-400">{t(message)}</p>
    </div>
  );
}

export type SummaryTone = "ok" | "amber" | "red";

const SUMMARY_TONE_CLASSES: Record<string, string> = {
  ok: "bg-green-500/20 text-green-400",
  amber: "bg-amber-500/20 text-amber-400",
  red: "bg-red-500/20 text-red-400",
};

/** Small pill used as a SectionCard `summary` badge so a collapsed section
 * still communicates health at a glance. */
export function SectionSummaryBadge({
  tone,
  children,
}: {
  tone: SummaryTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[10px] font-medium normal-case ${SUMMARY_TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
