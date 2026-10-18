import { useCallback, useSyncExternalStore } from "react";

export function tabIdFromPathname(pathname: string): string {
  const segment = pathname.replace(/^\/+/, "").split("/")[0];
  return segment === "import-export" ? "keymap" : segment || "home";
}

export function pathnameFromTabId(tabId: string): string {
  return tabId === "home" ? "/" : `/${tabId}`;
}

function subscribeToNavigation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

export function usePathname(): string {
  return useSyncExternalStore(
    subscribeToNavigation,
    () => window.location.pathname,
  );
}

/**
 * Keeps the active tab in sync with the URL path (e.g. /keymap) so tabs
 * are reachable via direct links, browser back/forward, and sharing.
 */
export function useUrlTab(): [string, (tabId: string) => void] {
  const tabId = tabIdFromPathname(usePathname());

  const navigate = useCallback((nextTabId: string) => {
    const path = pathnameFromTabId(nextTabId);
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    // Keep route-level consumers (including page metadata) in sync.
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  return [tabId, navigate];
}
