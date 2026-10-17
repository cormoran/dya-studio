export const themeOptions = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "pop", label: "Pop" },
  { value: "neutral", label: "Neutral" },
] as const;

export type Theme = (typeof themeOptions)[number]["value"];

export function isTheme(value: unknown): value is Theme {
  return themeOptions.some((option) => option.value === value);
}
