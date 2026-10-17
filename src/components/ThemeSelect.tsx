import { useId } from "react";
import { useTheme } from "../hooks/useTheme";
import { useLanguage } from "../hooks/useLanguage";
import { isTheme, themeOptions } from "../themes/themes";

export function ThemeSelect({ fullWidth = false }: { fullWidth?: boolean }) {
  const id = useId();
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className={fullWidth ? "w-full" : "shrink-0"}>
      <label
        htmlFor={id}
        className={fullWidth ? "block text-sm mb-2" : "sr-only"}
      >
        {t("Theme")}
      </label>
      <select
        id={id}
        className={`select-field min-h-11 ${fullWidth ? "w-full min-w-0 text-base" : "text-sm"}`}
        value={theme}
        onChange={(event) => {
          if (isTheme(event.target.value)) setTheme(event.target.value);
        }}
      >
        {themeOptions.map(({ value, label }) => (
          <option key={value} value={value}>
            {t(label)}
          </option>
        ))}
      </select>
    </div>
  );
}
