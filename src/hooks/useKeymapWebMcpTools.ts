import { useMemo } from "react";
import type { UseKeymapReturn } from "./useKeymap";
import { requireInteger, useWebMcpTools, type WebMcpTool } from "../lib/webMcp";

const EMPTY_INPUT_SCHEMA = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

function requireUint32(
  input: Parameters<typeof requireInteger>[0],
  name: string,
) {
  const value = requireInteger(input, name);
  if (value < 0 || value > 0xffffffff) {
    throw new RangeError(`${name} must be between 0 and 4294967295`);
  }
  return value;
}

type KeymapWebMcpApi = Pick<
  UseKeymapReturn,
  | "behaviors"
  | "discardChanges"
  | "error"
  | "getBindingDisplayName"
  | "hasUnsavedChanges"
  | "isFullyLoaded"
  | "isLoading"
  | "keymap"
  | "saveChanges"
  | "setBinding"
>;

export function createKeymapWebMcpTools(
  keymap: KeymapWebMcpApi,
): readonly WebMcpTool[] {
  const requireLoadedKeymap = () => {
    if (keymap.isLoading) {
      throw new Error("The keymap is still loading");
    }
    if (!keymap.keymap) {
      throw new Error(
        keymap.error
          ? `The keymap is unavailable: ${keymap.error}`
          : "The keymap has not been loaded",
      );
    }
    return keymap.keymap;
  };

  return [
    {
      name: "dya_get_keymap_state",
      title: "Get keymap state",
      description:
        "Get keymap loading, error, unsaved-change, layer binding, and available behavior information. Behavior parameter metadata describes valid parameter choices.",
      inputSchema: EMPTY_INPUT_SCHEMA,
      annotations: { readOnlyHint: true, openWorldHint: false },
      execute: () => ({
        loading: keymap.isLoading,
        fullyLoaded: keymap.isFullyLoaded,
        error: keymap.error,
        unsaved: keymap.hasUnsavedChanges,
        layers:
          keymap.keymap?.layers.map((layer) => ({
            id: layer.id,
            name: layer.name,
            bindings: layer.bindings.map((binding, keyPosition) => ({
              keyPosition,
              behaviorId: binding.behaviorId,
              param1: binding.param1,
              param2: binding.param2,
              displayName: keymap.getBindingDisplayName(binding),
            })),
          })) ?? [],
        availableBehaviors: Array.from(keymap.behaviors.values()).map(
          (behavior) => ({
            id: behavior.id,
            displayName: behavior.displayName,
            parameterSets: behavior.metadata,
          }),
        ),
      }),
    },
    {
      name: "dya_set_keymap_binding",
      title: "Edit a key binding",
      description:
        "Stage a binding edit for one key. The edit remains unsaved until dya_save_keymap is called. Choose a behavior and parameters from dya_get_keymap_state.",
      inputSchema: {
        type: "object",
        properties: {
          layerId: { type: "integer", minimum: 0 },
          keyPosition: { type: "integer", minimum: 0 },
          behaviorId: { type: "integer", minimum: 0 },
          param1: { type: "integer", minimum: 0, maximum: 0xffffffff },
          param2: { type: "integer", minimum: 0, maximum: 0xffffffff },
        },
        required: ["layerId", "keyPosition", "behaviorId", "param1", "param2"],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      execute: async (input) => {
        const current = requireLoadedKeymap();
        const layerId = requireUint32(input, "layerId");
        const keyPosition = requireUint32(input, "keyPosition");
        const behaviorId = requireUint32(input, "behaviorId");
        const param1 = requireUint32(input, "param1");
        const param2 = requireUint32(input, "param2");
        const layer = current.layers.find(
          (candidate) => candidate.id === layerId,
        );
        if (!layer) throw new RangeError(`Unknown layer ID: ${layerId}`);
        if (keyPosition >= layer.bindings.length) {
          throw new RangeError(
            `Invalid key position ${keyPosition} for layer ${layerId}`,
          );
        }
        if (!keymap.behaviors.has(behaviorId)) {
          throw new RangeError(`Unknown behavior ID: ${behaviorId}`);
        }

        const ok = await keymap.setBinding(layerId, keyPosition, {
          behaviorId,
          param1,
          param2,
        });
        if (!ok) throw new Error("The keyboard rejected the binding edit");
        return { edited: true, layerId, keyPosition };
      },
    },
    {
      name: "dya_save_keymap",
      title: "Save keymap",
      description:
        "Persist all staged keymap changes to the connected keyboard.",
      inputSchema: EMPTY_INPUT_SCHEMA,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      execute: async () => {
        requireLoadedKeymap();
        if (!(await keymap.saveChanges())) {
          throw new Error("The keyboard failed to save keymap changes");
        }
        return { saved: true };
      },
    },
    {
      name: "dya_discard_keymap_changes",
      title: "Discard keymap changes",
      description:
        "Discard every staged, unsaved keymap change and reload the persisted keymap from the keyboard.",
      inputSchema: EMPTY_INPUT_SCHEMA,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      execute: async () => {
        requireLoadedKeymap();
        if (!(await keymap.discardChanges())) {
          throw new Error("The keyboard failed to discard keymap changes");
        }
        return { discarded: true };
      },
    },
  ];
}

/** Register keymap tools only while the keymap tab is visible. */
export function useKeymapWebMcpTools(
  keymap: UseKeymapReturn,
  enabled: boolean,
): void {
  const {
    behaviors,
    discardChanges,
    error,
    getBindingDisplayName,
    hasUnsavedChanges,
    isFullyLoaded,
    isLoading,
    keymap: keymapState,
    saveChanges,
    setBinding,
  } = keymap;
  const tools = useMemo(
    () =>
      createKeymapWebMcpTools({
        behaviors,
        discardChanges,
        error,
        getBindingDisplayName,
        hasUnsavedChanges,
        isFullyLoaded,
        isLoading,
        keymap: keymapState,
        saveChanges,
        setBinding,
      }),
    [
      behaviors,
      discardChanges,
      error,
      getBindingDisplayName,
      hasUnsavedChanges,
      isFullyLoaded,
      isLoading,
      keymapState,
      saveChanges,
      setBinding,
    ],
  );
  useWebMcpTools(tools, enabled);
}
