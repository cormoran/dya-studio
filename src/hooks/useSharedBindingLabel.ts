import { useContext } from "react";
import { KeyboardLayoutContext } from "../contexts/KeyboardLayoutContext";
import { bindingLabel } from "../lib/abyss/abyssDiff";

/** Use the same OS layout names as the editable keyboard preview. */
export function useSharedBindingLabel() {
  const { layout } = useContext(KeyboardLayoutContext);
  return (binding: unknown) => bindingLabel(binding, layout);
}
