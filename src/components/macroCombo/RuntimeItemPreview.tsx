import { Fragment, type ReactNode } from "react";
import {
  IconArrowDown,
  IconArrowUp,
  IconHandClick,
  IconZzz,
} from "@tabler/icons-react";
import type {
  BehaviorBinding,
  BehaviorDefinition,
} from "../../hooks/useKeymap";
import {
  formatBehaviorBinding,
  type FormatContext,
} from "../../lib/behaviorMetadata";
import { useLanguage } from "../../hooks/useLanguage";
import type { MacroDetail } from "../../hooks/useRuntimeMacro";
import type { Config } from "../../proto/cormoran/runtime_tapdance/runtime_tapdance";
import {
  buildMacroStepRows,
  getKeyPressBehaviorId,
  getStepBinding,
} from "./macroStepUtils";
import { TAP_DANCE_ACTIONS } from "../../lib/runtimeTapDance";

type Token = { key: number; value: string; action?: string; icon?: ReactNode };
type BindingContext = {
  behaviors: Map<number, BehaviorDefinition>;
  context: FormatContext;
};
function bindingLabel(
  binding: BehaviorBinding | null | undefined,
  { behaviors, context }: BindingContext,
) {
  return binding
    ? formatBehaviorBinding(
        binding,
        behaviors.get(binding.behaviorId) ?? null,
        context,
      )
    : "—";
}
function Preview({ tokens, empty }: { tokens: Token[]; empty: string }) {
  if (!tokens.length) return <span className="text-xs">{empty}</span>;
  return (
    <span
      className="line-clamp-2 text-xs leading-5"
      title={tokens
        .map((token) => [token.action, token.value].filter(Boolean).join(": "))
        .join(" → ")}
    >
      {tokens.map((token, index) => (
        <Fragment key={token.key}>
          {index > 0 && (
            <span aria-hidden="true" className="mx-1 opacity-50">
              →
            </span>
          )}
          <span className="inline-flex max-w-full items-center gap-1 align-middle">
            {token.action && <span className="sr-only">{token.action}: </span>}
            {token.icon && (
              <span aria-hidden="true" className="shrink-0">
                {token.icon}
              </span>
            )}
            <span className="truncate">{token.value}</span>
          </span>
        </Fragment>
      ))}
    </span>
  );
}
export function MacroItemPreview({
  macro,
  keyPressBehaviorId,
  ...props
}: BindingContext & { macro: MacroDetail; keyPressBehaviorId?: number }) {
  const { t } = useLanguage();
  const rows = buildMacroStepRows(
    macro.steps,
    keyPressBehaviorId || getKeyPressBehaviorId(props.behaviors),
    null,
  );
  const tokens = rows.map((row): Token => {
    if (row.action === "string")
      return { key: row.startIndex, value: JSON.stringify(row.value ?? "") };
    if (row.action === "delay")
      return {
        key: row.startIndex,
        value: `${row.step?.delay?.delayMs ?? 0} ms`,
        action: t("Delay"),
        icon: <IconZzz size={13} />,
      };
    const action =
      row.action === "down" ? "Down" : row.action === "up" ? "Up" : "Tap";
    const Icon =
      row.action === "down"
        ? IconArrowDown
        : row.action === "up"
          ? IconArrowUp
          : IconHandClick;
    return {
      key: row.startIndex,
      value: bindingLabel(row.step ? getStepBinding(row.step) : null, props),
      action: t(action),
      icon: <Icon size={13} />,
    };
  });
  return <Preview tokens={tokens} empty={t("No steps")} />;
}
export function TapDanceItemPreview({
  config,
  ...props
}: BindingContext & { config?: Config }) {
  const { t } = useLanguage();
  const tokens = TAP_DANCE_ACTIONS.flatMap((field, index): Token[] => {
    const binding = config?.[field];
    return binding?.behaviorId
      ? [
          {
            key: index,
            action: `${index + 1}×`,
            value: bindingLabel(binding, props),
            icon: <span className="font-mono opacity-70">{index + 1}×</span>,
          },
        ]
      : [];
  });
  return <Preview tokens={tokens} empty={t("Not set")} />;
}
