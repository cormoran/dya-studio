/**
 * PhysicalLayoutModule Component
 *
 * Renders a non-key physical module from the physical layouts subsystem.
 */
import { useMemo } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  IconCircleDot,
  IconDeviceDesktop,
  IconRectangle,
  IconRotateRectangle,
} from "@tabler/icons-react";
import type { PhysicalLayoutModulePresentation } from "../hooks/usePhysicalLayoutModules";
import { useLanguage } from "../hooks/useLanguage";

const BASE_UNIT_SIZE = 54;

interface PhysicalLayoutModuleProps {
  module: PhysicalLayoutModulePresentation;
  scale?: number;
}

const moduleIcon = {
  trackball: IconCircleDot,
  "rotary-encoder": IconRotateRectangle,
  "touch-pad": IconRectangle,
  "custom-module": IconDeviceDesktop,
};

export function PhysicalLayoutModule({
  module,
  scale = 1.0,
}: PhysicalLayoutModuleProps) {
  const { t } = useLanguage();
  const style = useMemo(() => {
    const unitSize = BASE_UNIT_SIZE * scale;
    const width = (module.attrs.width / 100) * unitSize;
    const height = (module.attrs.height / 100) * unitSize;
    const x = (module.attrs.x / 100) * unitSize;
    const y = (module.attrs.y / 100) * unitSize;
    const rotation = module.attrs.r / 100;
    const rotationCenterX = (module.attrs.rx / 100) * unitSize;
    const rotationCenterY = (module.attrs.ry / 100) * unitSize;

    return {
      width: `${Math.max(width, 20)}px`,
      height: `${Math.max(height, 20)}px`,
      left: `${x}px`,
      top: `${y}px`,
      transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
      transformOrigin:
        rotation !== 0
          ? `${rotationCenterX - x}px ${rotationCenterY - y}px`
          : undefined,
    };
  }, [module.attrs, scale]);

  const fontSize = useMemo(() => {
    const scaledSize = 11 * scale;
    return Math.max(8, Math.min(13, scaledSize));
  }, [scale]);

  const Icon = moduleIcon[module.kind];
  const isRound =
    module.kind === "trackball" || module.kind === "rotary-encoder";
  const title = module.enabled
    ? module.displayName
    : `${module.displayName} (${t("disabled")})`;

  const content = (
    <div
      className={`
        physical-layout-module absolute border transition-colors duration-150 pointer-events-auto
        flex flex-col items-center justify-center gap-1 p-1.5 overflow-hidden
        ${
          module.enabled
            ? "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]"
            : "bg-[var(--color-surface)]/70 border-dashed border-[var(--color-text-muted)]/40 text-[var(--color-text-muted)] opacity-70"
        }
        ${isRound ? "rounded-full" : "rounded-lg"}
      `}
      style={style}
      aria-label={title}
    >
      <Icon size={Math.max(14, Math.min(20, 16 * scale))} />
      <span
        className="font-medium text-center leading-tight line-clamp-2 break-words"
        style={{ fontSize: `${fontSize}px` }}
      >
        {module.label}
      </span>
    </div>
  );

  return (
    <Tooltip.Provider delayDuration={200} disableHoverableContent>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{content}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="px-3 py-2 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] shadow-lg z-50 max-w-xs"
            sideOffset={5}
          >
            <div className="space-y-1">
              <div>
                <span className="font-medium">{module.displayName}</span>
                {!module.enabled && (
                  <span className="ml-1 text-[var(--color-text-muted)]">
                    {t("disabled")}
                  </span>
                )}
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">
                  {t("Type")}:{" "}
                </span>
                <span>{module.label}</span>
              </div>
              {module.links.length > 0 && (
                <div>
                  <span className="text-[var(--color-text-muted)]">
                    {t("Links")}:{" "}
                  </span>
                  <span>
                    {module.links
                      .map(
                        (link) =>
                          `${link.deviceIdentifier} (${link.subsystemIdentifier})`,
                      )
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>
            <Tooltip.Arrow className="fill-[var(--color-surface-elevated)]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
