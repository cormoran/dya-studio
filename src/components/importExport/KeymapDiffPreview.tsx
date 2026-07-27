/**
 * Layer-by-layer visual diff: tab per layer, physical preview of the selected
 * one, changed keys highlighted and explained on hover.
 *
 * Shared by export and import — the two directions differ only in which side is
 * "before" and which is "after", which the caller resolves before getting here.
 */
import { useMemo, useState } from "react";
import { useLanguage } from "../../hooks/useLanguage";
import { LayerTabs } from "./LayerTabs";
import {
  KeymapLayerPreview,
  type PreviewChange,
  type PreviewPosition,
} from "./KeymapLayerPreview";
import type { KeymapDiff } from "../../lib/abyss/abyssDiff";

export interface PreviewLayer {
  name?: string;
  bindings: unknown[];
}

export function KeymapDiffPreview({
  positions,
  layers,
  diff,
}: {
  /** Key geometry from the Abyss layout document. */
  positions: PreviewPosition[];
  /** Layers as they would be *after* the change, so the preview shows the result. */
  layers: PreviewLayer[];
  diff: KeymapDiff;
}) {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);

  /** Changed keys per layer, so each layer's preview is a plain lookup. */
  const changesByLayer = useMemo(() => {
    const byLayer = new Map<number, Map<number, PreviewChange>>();
    for (const change of diff.bindingChanges) {
      const layer =
        byLayer.get(change.layerIndex) ?? new Map<number, PreviewChange>();
      layer.set(change.keyIndex, { from: change.from, to: change.to });
      byLayer.set(change.layerIndex, layer);
    }
    return byLayer;
  }, [diff.bindingChanges]);

  const tabs = layers.map((layer, index) => ({
    index,
    name: layer.name ?? "",
    changeCount: changesByLayer.get(index)?.size ?? 0,
  }));

  // Land on the first layer that actually changed rather than always layer 0,
  // which is usually unchanged and makes the preview look like it is not working.
  const firstChanged = tabs.find((tab) => tab.changeCount > 0)?.index ?? 0;
  const [touched, setTouched] = useState(false);
  const shownIndex = touched ? activeIndex : firstChanged;
  const layer = layers[shownIndex];

  if (layers.length === 0) return null;

  return (
    <div>
      <LayerTabs
        layers={tabs}
        activeIndex={shownIndex}
        onSelect={(index) => {
          setTouched(true);
          setActiveIndex(index);
        }}
      />
      {layer ? (
        <KeymapLayerPreview
          positions={positions}
          bindings={layer.bindings}
          changes={changesByLayer.get(shownIndex) ?? new Map()}
        />
      ) : (
        <p className="text-xs text-[var(--color-text-muted)]">
          {t("This layer does not exist in the selected keymap.")}
        </p>
      )}
    </div>
  );
}
