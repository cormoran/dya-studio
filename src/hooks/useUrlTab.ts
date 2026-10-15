import { useCallback, useEffect, useState } from "react";

export function tabIdFromPathname(pathname: string): string {
  const segment = pathname.replace(/^\/+/, "").split("/")[0];
  return segment === "import-export" ? "keymap" : segment || "home";
}

export function pathnameFromTabId(tabId: string): string {
  return tabId === "home" ? "/" : `/${tabId}`;
}

/**
 * Keeps the active tab in sync with the URL path (e.g. /keymap) so tabs
 * are reachable via direct links, browser back/forward, and sharing.
 */
export function useUrlTab(): [string, (tabId: string) => void] {
  const [tabId, setTabId] = useState(() =>
    tabIdFromPathname(window.location.pathname),
  );

  useEffect(() => {
    const onPopState = () =>
      setTabId(tabIdFromPathname(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((nextTabId: string) => {
    const path = pathnameFromTabId(nextTabId);
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    setTabId(nextTabId);
  }, []);

  return [tabId, navigate];
}
