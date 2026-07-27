/**
 * TabActiveContext
 *
 * Tab panels stay mounted once they have been visited (see TabNavigation), so
 * an inactive tab keeps its state instead of being torn down and re-read from
 * the keyboard. Pages that drive continuous device traffic — key-event
 * streaming, periodic polling — read this to pause while they are off-screen.
 *
 * Defaults to true so a page rendered outside the tab shell (tests, the
 * standalone release notes route) behaves as if it were visible.
 */
import { createContext } from "react";

export const TabActiveContext = createContext(true);
