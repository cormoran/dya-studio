/**
 * Shows exactly what a write would change.
 *
 * Designed for the large case: replacing a full keymap is several hundred
 * binding rows, and a flat list of those is unreadable. Changes are grouped
 * into one collapsible card per layer so a collapsed card still says how much
 * it contains, and the row list is capped until the user asks for all of it.
 */
import { useState } from "react";
import { useLanguage } from "../../hooks/useLanguage";
import { SectionCard } from "../troubleshooting/SectionCard";
import {
  BINDING_ROW_LIMIT,
  bindingLabel,
  countDiff,
  globalModuleChanges,
  groupByLayer,
  type CollectionChange,
  type KeymapDiff,
  type LayerDiff,
} from "../../lib/abyss/abyssDiff";

function Chip({ label, count }: { label: string; count: number }) {
  if (count === 0) return null;
  return (
    <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-border)] text-[var(--color-text-muted)] tabular-nums">
      {count} {label}
    </span>
  );
}

/** `#12  ▽ → LT(2, 0x2c)` */
function BindingRow({
  keyIndex,
  from,
  to,
}: {
  keyIndex: number;
  from?: unknown;
  to?: unknown;
}) {
  return (
    <div className="flex items-center gap-2 text-xs py-0.5">
      <span className="w-10 flex-shrink-0 text-[var(--color-text-muted)] tabular-nums">
        #{keyIndex}
      </span>
      <span className="text-[var(--color-text-muted)] line-through">
        {bindingLabel(from)}
      </span>
      <span className="text-[var(--color-text-muted)]">→</span>
      <span className="text-[var(--color-neon)]">{bindingLabel(to)}</span>
    </div>
  );
}

function LayerCard({ layer }: { layer: LayerDiff }) {
  const { t } = useLanguage();
  const [showAll, setShowAll] = useState(false);
  const changeCount =
    layer.bindingChanges.length +
    layer.moduleChanges.length +
    (layer.nameChange ? 1 : 0);
  const visible = showAll
    ? layer.bindingChanges
    : layer.bindingChanges.slice(0, 50);

  return (
    <SectionCard
      icon={
        <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
          L{layer.layerIndex}
        </span>
      }
      title={
        layer.layerName || t("Layer {{index}}", { index: layer.layerIndex })
      }
      summary={
        <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
          {t("{{count}} changes", { count: changeCount })}
        </span>
      }
    >
      {layer.nameChange && (
        <p className="text-sm text-[var(--color-text)] mb-3">
          {t("Rename")}:{" "}
          <span className="text-[var(--color-text-muted)] line-through">
            {layer.nameChange.from ?? "—"}
          </span>{" "}
          →{" "}
          <span className="text-[var(--color-neon)]">
            {layer.nameChange.to}
          </span>
        </p>
      )}

      {layer.bindingChanges.length > 0 && (
        <div className="mb-3">
          {visible.map((change) => (
            <BindingRow
              key={change.keyIndex}
              keyIndex={change.keyIndex}
              from={change.from}
              to={change.to}
            />
          ))}
          {!showAll && layer.bindingChanges.length > visible.length && (
            <button
              className="btn-ghost text-xs mt-2"
              onClick={() => setShowAll(true)}
            >
              {t("Show all {{count}} keys", {
                count: layer.bindingChanges.length,
              })}
            </button>
          )}
        </div>
      )}

      {layer.moduleChanges.map((change) => (
        <p
          key={change.moduleName}
          className="text-xs text-[var(--color-text-muted)]"
        >
          {t("Module")}: {change.moduleName}
        </p>
      ))}
    </SectionCard>
  );
}

function CollectionList({
  title,
  changes,
}: {
  title: string;
  changes: CollectionChange[];
}) {
  if (changes.length === 0) return null;
  return (
    <div className="glass-card p-6">
      <h4 className="text-sm font-medium text-[var(--color-text)] mb-2">
        {title}
      </h4>
      {changes.map((change) => (
        <details key={change.index} className="text-xs mb-1">
          <summary className="cursor-pointer text-[var(--color-text-muted)]">
            {change.label}
            {change.to === undefined ? " (removed)" : ""}
          </summary>
          <pre className="mt-1 p-2 rounded bg-[var(--color-border)] overflow-x-auto text-[10px] text-[var(--color-text-muted)]">
            {JSON.stringify(change.to ?? change.from, null, 2)}
          </pre>
        </details>
      ))}
    </div>
  );
}

export function KeymapDiffView({ diff }: { diff: KeymapDiff }) {
  const { t } = useLanguage();
  const [showLargeDiff, setShowLargeDiff] = useState(false);
  const counts = countDiff(diff);
  const layers = groupByLayer(diff);
  const globals = globalModuleChanges(diff);
  // A full keymap replacement is several hundred rows; rendering them all is
  // slow and tells the user nothing they cannot get from the counts.
  const isLarge = counts.bindings > BINDING_ROW_LIMIT && !showLargeDiff;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip label={t("bindings")} count={counts.bindings} />
        <Chip label={t("layer names")} count={counts.layerNames} />
        <Chip label={t("combos")} count={counts.combos} />
        <Chip label={t("macros")} count={counts.macros} />
        <Chip label={t("modules")} count={counts.modules} />
      </div>

      {isLarge ? (
        <div className="glass-card p-6">
          <p className="text-sm text-[var(--color-text-muted)] mb-3">
            {t(
              "This replaces most of the keymap ({{count}} keys). The full list is long.",
              { count: counts.bindings },
            )}
          </p>
          <button
            className="btn-ghost text-sm"
            onClick={() => setShowLargeDiff(true)}
          >
            {t("Show the full list anyway")}
          </button>
        </div>
      ) : (
        layers.map((layer) => (
          <LayerCard key={layer.layerIndex} layer={layer} />
        ))
      )}

      <CollectionList title={t("Combos")} changes={diff.comboChanges} />
      <CollectionList title={t("Macros")} changes={diff.macroChanges} />

      {globals.length > 0 && (
        <div className="glass-card p-6">
          <h4 className="text-sm font-medium text-[var(--color-text)] mb-2">
            {t("Module settings")}
          </h4>
          {globals.map((change) => (
            <p
              key={change.moduleName}
              className="text-xs text-[var(--color-text-muted)]"
            >
              {change.moduleName}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
