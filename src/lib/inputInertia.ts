import type { Request } from "../proto/zmk/runtime_input_processor/runtime_input_processor";

export const inertiaFields = [
  {
    key: "inertiaWindowMs",
    request: "setInertiaWindow",
    value: "windowMs",
    label: "Measurement Window (ms)",
    min: 1,
    max: 60000,
    hint: "Input measurement window for inertia and Fast input.",
  },
  {
    key: "inertiaIntervalMs",
    request: "setInertiaInterval",
    value: "intervalMs",
    label: "Output Interval (ms)",
    min: 1,
    max: 60000,
    hint: "Generated output cadence; output is scaled by interval / window.",
  },
  {
    key: "inertiaThreshold",
    request: "setInertiaThreshold",
    value: "threshold",
    label: "Input Threshold",
    min: 1,
    max: 65535,
    hint: "Threshold in scaled input counts. Reverse input stops inertia.",
  },
  {
    key: "inertiaDecayPercent",
    request: "setInertiaDecay",
    value: "decayPercent",
    label: "Decay per Output Interval (%)",
    min: 0,
    max: 100,
    hint: "0 keeps speed; 100 stops after one more interval.",
  },
  {
    key: "inertiaNormalMaxOutput",
    request: "setInertiaNormalMaxOutput",
    value: "maxOutput",
    label: "Normal Output Limit",
    min: 0,
    max: 32767,
    hint: "0 is unlimited. Fast input ignores this limit.",
  },
  {
    key: "inertiaFastThreshold",
    request: "setInertiaFastThreshold",
    value: "threshold",
    label: "Fast Input Threshold",
    min: 0,
    max: 65535,
    hint: "0 disables Fast input. Boost lasts until inertia stops.",
  },
  {
    key: "inertiaFastOutputPercent",
    request: "setInertiaFastOutputPercent",
    value: "percent",
    label: "Fast Output (%)",
    min: 100,
    max: 1000,
    hint: "200% doubles generated inertia output.",
  },
] as const;
export type InertiaField = (typeof inertiaFields)[number]["key"];
export type InertiaSettings = Record<InertiaField, number> & {
  inertiaEnabled: boolean;
};
export type InertiaSetting = keyof InertiaSettings;
export function inertiaRequest(
  id: number,
  key: InertiaSetting,
  value: number | boolean,
): Partial<Request> {
  if (key === "inertiaEnabled")
    return { setInertiaEnabled: { id, enabled: Boolean(value), writeMode: 0 } };
  const field = inertiaFields.find((field) => field.key === key)!;
  return { [field.request]: { id, [field.value]: value, writeMode: 0 } };
}
