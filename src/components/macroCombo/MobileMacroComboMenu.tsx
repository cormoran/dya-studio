import { useState, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { IconChevronDown, IconPlus } from "@tabler/icons-react";
import { StatusDot, type EditStatus } from "../EditStatusIndicator";
import { useLanguage } from "../../hooks/useLanguage";

export interface MobileMacroComboMenuItem {
  id: string;
  label: string;
  selected: boolean;
  status?: EditStatus;
  onSelect: () => void;
}

interface MobileMacroComboMenuProps {
  macros?: MobileMacroComboMenuItem[];
  combos?: MobileMacroComboMenuItem[];
  settings?: MobileMacroComboMenuItem[];
  onCreateMacro?: () => void;
  onCreateCombo?: () => void;
  createMacroDisabled?: boolean;
}

export function MobileMacroComboMenu({
  macros,
  combos,
  settings,
  onCreateMacro,
  onCreateCombo,
  createMacroDisabled = false,
}: MobileMacroComboMenuProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const selected = [
    ...(macros ?? []),
    ...(combos ?? []),
    ...(settings ?? []),
  ].find((item) => item.selected);

  const run = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="desktop:hidden min-w-0 flex-1 h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-electric)]/40 flex items-center gap-2 text-left transition-colors"
          aria-label={t("Select macro, combo, or settings")}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          {selected?.status && <StatusDot status={selected.status} />}
          <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text)]">
            {selected?.label ?? t("Select a macro or combo")}
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
          {macros && (
            <MenuSection label={t("Macros")}>
              {macros.map((item) => (
                <MenuItem key={item.id} item={item} onRun={run} />
              ))}
              {onCreateMacro && (
                <CreateItem
                  label={t("Create macro")}
                  onSelect={() => run(onCreateMacro)}
                  disabled={createMacroDisabled}
                />
              )}
            </MenuSection>
          )}

          {combos && (
            <MenuSection label={t("Combos")} divided>
              {combos.map((item) => (
                <MenuItem key={item.id} item={item} onRun={run} />
              ))}
              {onCreateCombo && (
                <CreateItem
                  label={t("New combo")}
                  onSelect={() => run(onCreateCombo)}
                />
              )}
            </MenuSection>
          )}

          {settings && settings.length > 0 && (
            <MenuSection label={t("Settings")} divided>
              {settings.map((item) => (
                <MenuItem key={item.id} item={item} onRun={run} />
              ))}
            </MenuSection>
          )}
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
  item: MobileMacroComboMenuItem;
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

function CreateItem({
  label,
  onSelect,
  disabled = false,
}: {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm text-[var(--color-electric)] hover:bg-[var(--color-electric)]/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
      onClick={onSelect}
      disabled={disabled}
    >
      <IconPlus size={15} />
      <span className="truncate">{label}</span>
    </button>
  );
}
