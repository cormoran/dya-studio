import type { UseVersionHistoryReturn } from "../../hooks/useVersionHistory";
import type { JsonValue } from "../../lib/versionHistory";

/** Empty, idle history for page tests concerned with editing, not persistence. */
export function createIdleVersionHistory(): UseVersionHistoryReturn<JsonValue> {
  return {
    versions: [],
    isBusy: false,
    capture: async () => undefined,
    reload: async () => undefined,
  };
}
