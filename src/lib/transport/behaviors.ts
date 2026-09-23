export const BEHAVIORS = [
  {
    id: 29,
    displayName: "Layer-Tap",
    metadata: [
      {
        param1: [
          {
            name: "Layer",
            layerId: {},
          },
        ],
        param2: [
          {
            name: "Key",
            hidUsage: {
              keyboardMax: 255,
              consumerMax: 4095,
            },
          },
        ],
      },
    ],
  },
  {
    id: 34,
    displayName: "Mod-Tap",
    metadata: [
      {
        param1: [
          {
            name: "Key",
            hidUsage: {
              keyboardMax: 255,
              consumerMax: 4095,
            },
          },
        ],
        param2: [
          {
            name: "Key",
            hidUsage: {
              keyboardMax: 255,
              consumerMax: 4095,
            },
          },
        ],
      },
    ],
  },
  {
    id: 35,
    displayName: "Transparent",
    metadata: [],
  },
  {
    id: 3,
    displayName: "Mouse Key Press",
    metadata: [
      {
        param1: [
          {
            name: "MB1",
            constant: 1,
          },
          {
            name: "MB2",
            constant: 2,
          },
          {
            name: "MB3",
            constant: 4,
          },
          {
            name: "MB4",
            constant: 8,
          },
          {
            name: "MB5",
            constant: 16,
          },
        ],
        param2: [],
      },
    ],
  },
  {
    id: 4,
    displayName: "mouse_move",
    metadata: [],
  },
  {
    id: 5,
    displayName: "mouse_scroll",
    metadata: [],
  },
  {
    id: 6,
    displayName: "None",
    metadata: [],
  },

  {
    id: 8,
    displayName: "Caps Word",
    metadata: [],
  },
  {
    id: 9,
    displayName: "External Power",
    metadata: [],
  },
  {
    id: 10,
    displayName: "Key Press",
    metadata: [
      {
        param1: [
          {
            name: "Key",
            hidUsage: {
              keyboardMax: 255,
              consumerMax: 4095,
            },
          },
        ],
        param2: [],
      },
    ],
  },
  {
    id: 11,
    displayName: "Grave/Escape",
    metadata: [],
  },
  {
    id: 12,
    displayName: "Key Repeat",
    metadata: [],
  },
  {
    id: 13,
    displayName: "Key Toggle",
    metadata: [
      {
        param1: [
          {
            name: "Key",
            hidUsage: {
              keyboardMax: 255,
              consumerMax: 4095,
            },
          },
        ],
        param2: [],
      },
    ],
  },
  {
    id: 14,
    displayName: "Sticky Key",
    metadata: [
      {
        param1: [
          {
            name: "Key",
            hidUsage: {
              keyboardMax: 255,
              consumerMax: 4095,
            },
          },
        ],
        param2: [],
      },
    ],
  },
  {
    id: 15,
    displayName: "Momentary Layer",
    metadata: [
      {
        param1: [
          {
            name: "Layer",
            layerId: {},
          },
        ],
        param2: [],
      },
    ],
  },
  {
    id: 16,
    displayName: "Sticky Layer",
    metadata: [
      {
        param1: [
          {
            name: "Layer",
            layerId: {},
          },
        ],
        param2: [],
      },
    ],
  },
  {
    id: 17,
    displayName: "To Layer",
    metadata: [
      {
        param1: [
          {
            name: "Layer",
            layerId: {},
          },
        ],
        param2: [],
      },
    ],
  },
  {
    id: 18,
    displayName: "Toggle Layer",
    metadata: [
      {
        param1: [
          {
            name: "Layer",
            layerId: {},
          },
        ],
        param2: [],
      },
    ],
  },

  {
    id: 21,
    displayName: "Bluetooth",
    metadata: [
      {
        param1: [
          {
            name: "Next Profile",
            constant: 1,
          },
          {
            name: "Previous Profile",
            constant: 2,
          },
          {
            name: "Clear All Profiles",
            constant: 4,
          },
          {
            name: "Clear Selected Profile",
            constant: 0,
          },
        ],
        param2: [],
      },
      {
        param1: [
          {
            name: "Select Profile",
            constant: 3,
          },
          {
            name: "Disconnect Profile",
            constant: 5,
          },
        ],
        param2: [
          {
            name: "Profile",
            range: {
              min: 0,
              max: 4,
            },
          },
        ],
      },
    ],
  },
  {
    id: 22,
    displayName: "Bootloader",
    metadata: [],
  },
  {
    id: 23,
    displayName: "Studio Unlock",
    metadata: [],
  },
  {
    id: 24,
    displayName: "Reset",
    metadata: [],
  },

  {
    id: 30,
    displayName: "Output Selection",
    metadata: [
      {
        param1: [
          {
            name: "Toggle Outputs",
            constant: 0,
          },
          {
            name: "USB Output",
            constant: 1,
          },
          {
            name: "BLE Output",
            constant: 2,
          },
        ],
        param2: [],
      },
    ],
  },
  {
    id: 31,
    displayName: "Runtime Macro",
    metadata: [],
  },
].sort((a, b) => a.id - b.id);
