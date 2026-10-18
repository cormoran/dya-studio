import { createContext } from "react";
import type { UseRuntimeMacroReturn } from "../hooks/useRuntimeMacro";
import type { RuntimeTapDance } from "../hooks/useRuntimeTapDance";

/** Keep entries created by nested binding editors in the page's Save/Discard scope. */
export const RuntimeBehaviorContext = createContext<{
  macro: UseRuntimeMacroReturn;
  tapDance: RuntimeTapDance;
} | null>(null);
