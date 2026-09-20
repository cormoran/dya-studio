import { useState, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { IconChevronDown } from "@tabler/icons-react";
import { StatusDot, type EditStatus } from "../EditStatusIndicator";
import { useLanguage } from "../../hooks/useLanguage";

export interface MobileTrackballMenuItem {
  id: string;
  label: string;
  selected: boolean;
  status?: EditStatus;
  onSelect: () => void;
}

interface MobileTrackballMenuProps {
  processors: MobileTrackballMenuItem[];
  drivers: MobileTrackballMenuItem[];
}

export function MobileTrackballMenu({
  processors,
  drivers,
}: MobileTrackballMenuProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const selected = [...processors, ...drivers].find((item) => item.selected);
  const selectedSection = processors.some((item) => item.selected)
    ? t("Processor")
    : drivers.some((item) => item.selected)
      ? t("PMW3610 Driver")
      : null;

  const run = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="desktop:hidden min-w-0 flex-1 h-11 sm:h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-electric)]/40 flex items-center gap-2 text-left transition-colors"
          aria-label={t("Select processor or PMW3610 driver")}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          {selected?.status && <StatusDot status={selected.status} />}
          <span className="min-w-0 flex-1 flex flex-col justify-center">
            {selectedSection && (
              <span className="truncate text-[9px] leading-none font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                {selectedSection}
              </span>
            )}
            <span className="truncate text-xs leading-tight text-[var(--color-text)]">
              {selected?.label ?? t("Select processor or PMW3610 driver")}
            </span>
          </span>
          <IconChevronDown
            size={15}
            className={`shrink-0 text-[var(--color-text-muted)] transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          role="menu"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className="z-50 w-[var(--radix-popover-trigger-width)] min-w-64 max-w-[calc(100vw-16px)] max-h-[min(28rem,var(--radix-popover-content-available-height))] overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-xl py-1"
        >
          <MenuSection label={t("Processors")}>
            {processors.length > 0 ? (
              processors.map((item) => (
                <MenuItem key={item.id} item={item} onRun={run} />
              ))
            ) : (
              <EmptyItem label={t("No processors found")} />
            )}
          </MenuSection>

          <MenuSection label={t("PMW3610 Drivers")} divided>
            {drivers.length > 0 ? (
              drivers.map((item) => (
                <MenuItem key={item.id} item={item} onRun={run} />
              ))
            ) : (
              <EmptyItem
                label={t(
                  "No pmw3610 driver settings were reported by the keyboard.",
                )}
              />
            )}
          </MenuSection>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function MenuSection({
  label,
  divided = false,
  children,
}: {
  label: string;
  divided?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={
        divided ? "mt-1 border-t border-[var(--color-border)] pt-1" : ""
      }
    >
      <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </div>
      {children}
    </section>
  );
}

function MenuItem({
  item,
  onRun,
}: {
  item: MobileTrackballMenuItem;
  onRun: (action: () => void) => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`w-full px-3 py-2 flex items-center gap-2 text-left text-sm transition-colors ${
        item.selected
          ? "bg-[var(--color-electric)]/15 text-[var(--color-electric)]"
          : "text-[var(--color-text)] hover:bg-[var(--color-electric)]/10"
      }`}
      onClick={() => onRun(item.onSelect)}
    >
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.status && <StatusDot status={item.status} />}
    </button>
  );
}

function EmptyItem({ label }: { label: string }) {
  return (
    <p className="px-3 py-2 text-xs text-[var(--color-text-muted)]">{label}</p>
  );
}
