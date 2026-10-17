import type { FastKeymapModel, FastKeymapBinding } from "../lib/fastKeymap";
export const binding = (behaviorId: number, param1 = 0): FastKeymapBinding => ({
  behaviorId,
  param1,
  param2: 0,
});
export function guideModel(rows: FastKeymapBinding[][]): FastKeymapModel {
  return {
    definitionVersion: 1,
    availableLayers: rows.length,
    maxLayerNameLength: 32,
    stats: {
      behaviorsFromCache: false,
      behaviorsBundled: 0,
      behaviorsCached: 0,
      behaviorsFetched: 0,
      layersFromCache: 0,
      layersFetchedFull: 0,
      layersFetchedDiff: 0,
      physicalLayoutsFromCache: false,
    },
    layers: rows.map((bindings, index) => ({
      id: index + 20,
      name: `Layer ${index}`,
      bindings,
      bindingCount: bindings.length,
      editedCount: 0,
      loadedFromCache: false,
    })),
    layouts: [
      {
        name: "Test",
        fp: 0,
        keys: Array.from({ length: rows[0].length }, (_, i) => ({
          x: i * 100,
          y: 0,
          width: 100,
          height: 100,
          r: 0,
          rx: 0,
          ry: 0,
        })),
      },
    ],
    activeLayoutIndex: 0,
    behaviors: [
      "kp",
      "studio_unlock",
      "mo",
      "lt",
      "to",
      "tog",
      "trans",
      "custom",
    ].map((alias, localId) => ({
      localId,
      alias,
      displayName: alias,
      metadata: [],
      defFp: 0,
      resolvedFrom: "device",
    })),
    pendingLayerIds: [],
    behaviorsDeferred: false,
  };
}
