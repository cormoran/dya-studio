/**
 * Tab-like layer picker for the diff previews.
 *
 * A change count rides on each tab so the layers worth looking at are obvious
 * without opening them — with eight layers and changes in two, hunting through
 * them one by one is the slow part.
 */
import { useLanguage } from "../../hooks/useLanguage";

export interface LayerTabItem {
  index: number;
  name: string;
  /** Changed keys in this layer, shown as a badge when non-zero. */
  changeCount: number;
}

export function LayerTabs({
  layers,
  activeIndex,
  onSelect,
}: {
  layers: LayerTabItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const { t } = useLanguage();
  if (layers.length === 0) return null;

  return (
    <div
      role="tablist"
      aria-label={t("Layers")}
      className="flex flex-wrap gap-1 mb-3"
    >
      {layers.map((layer) => {
        const active = layer.index === activeIndex;
        return (
          <button
            key={layer.index}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(layer.index)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${
              active
                ? "border-[var(--color-electric)] bg-[var(--color-electric)]/15 text-[var(--color-electric)]"
                : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {layer.name || t("Layer {{index}}", { index: layer.index })}
            {layer.changeCount > 0 && (
              <span
                className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[var(--color-neon)]/20 text-[var(--color-neon)] tabular-nums"
                aria-label={t("{{count}} changes", {
                  count: layer.changeCount,
                })}
              >
                {layer.changeCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
