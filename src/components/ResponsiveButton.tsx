import type { ComponentProps, ReactNode } from "react";
import { EditorTooltip } from "./EditorTooltip";

export function ResponsiveButton({
  label,
  children,
  className = "",
  title,
  trailingIcon,
  ...props
}: ComponentProps<"button"> & {
  label: string;
  children: ReactNode;
  trailingIcon?: ReactNode;
}) {
  return (
    <EditorTooltip content={title ?? label}>
      <button
        type="button"
        {...props}
        aria-label={props["aria-label"] ?? label}
        className={`responsive-action ${className}`}
      >
        {children}
        <span className="hidden sm:inline">{label}</span>
        {trailingIcon}
      </button>
    </EditorTooltip>
  );
}
