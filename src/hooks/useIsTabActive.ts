import { useContext } from "react";
import { TabActiveContext } from "../contexts/TabActiveContext";

/** True while the calling page's tab is the visible one. */
export function useIsTabActive(): boolean {
  return useContext(TabActiveContext);
}
