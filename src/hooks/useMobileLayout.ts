import { useSyncExternalStore } from "react";

const query = "(max-width: 639px)";
const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const getSnapshot = () => window.matchMedia(query).matches;

/** Match the shared sm breakpoint without remounting editors on resize. */
export function useMobileLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
