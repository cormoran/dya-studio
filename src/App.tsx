import { useContext, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconCloudUpload,
  IconHome,
  IconKeyboard,
  IconPlugConnected,
  IconPointer,
  IconPuzzle,
  IconSettings,
  IconStethoscope,
  IconWand,
} from "@tabler/icons-react";

import { SplashScreen } from "./components/SplashScreen";
import { ReleaseNotesPage, RELEASE_NOTES_PATH } from "./pages/ReleaseNotesPage";
import { ReconnectingOverlay } from "./components/ReconnectingOverlay";
import {
  DeviceConnectionProvider,
  ConnectionContext,
} from "./components/DeviceConnection";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { KeyboardLayoutProvider } from "./contexts/KeyboardLayoutProvider";
import { StudioUnlockProvider } from "./contexts/StudioUnlockContext";
import { TabNavigation } from "./components/TabNavigation";
import type { TabItem } from "./components/TabNavigation";
import { AppLayout } from "./layouts/AppLayout";
import { HomePage } from "./pages/HomePage";
import { ConnectionPage } from "./pages/ConnectionPage";
import { KeymapPage } from "./pages/KeymapPage";
import { TrackballPage } from "./pages/TrackballPage";
import { MacroComboPage } from "./pages/MacroComboPage";
import { SettingsPage } from "./pages/SettingsPage";
import { CustomSubsystemsPage } from "./pages/CustomSubsystemsPage";
import { TroubleshootingPage } from "./pages/TroubleshootingPage";
import {
  ImportExportPage,
  IMPORT_EXPORT_TAB_ID,
} from "./pages/ImportExportPage";
import { AbyssCallbackPage } from "./pages/AbyssCallbackPage";
import { isAbyssConfigured } from "./lib/abyss/abyssConfig";
import { OAUTH_CALLBACK_PATH } from "./lib/abyss/abyssOAuth";
import { useLanguage } from "./hooks/useLanguage";
import { useUrlTab, pathnameFromTabId } from "./hooks/useUrlTab";
import { useDevtool } from "./hooks/useDevtool";
import { DevtoolWindow } from "./components/DevtoolWindow";
import { trackPageView } from "./lib/analytics";
import { DeveloperGuidePage } from "./components/developerGuide";
import {
  DEVELOPER_GUIDE_PATH,
  getDeveloperGuidePageDefinition,
  isDeveloperGuidePath,
} from "./content/developerGuide";

function getTabs(t: (key: string) => string): TabItem[] {
  return [
    {
      id: "home",
      label: t("Home"),
      icon: <IconHome size={18} />,
      content: <HomePage />,
    },
    {
      id: "keymap",
      label: t("Keymap"),
      icon: <IconKeyboard size={18} />,
      content: <KeymapPage />,
    },
    {
      id: "macro-combo",
      label: t("Macro&Combo"),
      icon: <IconWand size={18} />,
      content: <MacroComboPage />,
    },
    {
      id: "trackball",
      label: t("Trackball"),
      icon: <IconPointer size={18} />,
      content: <TrackballPage />,
    },
    {
      id: "connection",
      label: t("Connection"),
      icon: <IconPlugConnected size={18} />,
      content: <ConnectionPage />,
    },
    {
      id: "settings",
      label: t("Settings"),
      icon: <IconSettings size={18} />,
      content: <SettingsPage />,
    },
    {
      id: "troubleshooting",
      label: t("Troubleshooting"),
      icon: <IconStethoscope size={18} />,
      content: <TroubleshootingPage />,
    },
    {
      id: "subsystems",
      label: t("Subsystems"),
      icon: <IconPuzzle size={18} />,
      content: <CustomSubsystemsPage />,
    },
    // Hidden entirely when the build has no Abyss OAuth client id — the tab's
    // only entry point is a sign-in that could not succeed.
    ...(isAbyssConfigured()
      ? [
          {
            id: IMPORT_EXPORT_TAB_ID,
            label: t("Import/Export"),
            icon: <IconCloudUpload size={18} />,
            content: <ImportExportPage />,
          },
        ]
      : []),
  ];
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppRouter />
      </LanguageProvider>
    </ThemeProvider>
  );
}

/**
 * Select connection-free documentation before mounting any keyboard provider.
 * This keeps guide URLs usable on a browser without Web Serial, Web Bluetooth,
 * or a connected keyboard.
 */
function AppRouter() {
  const { language } = useLanguage();
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (isDeveloperGuidePath(pathname)) {
    return (
      <DeveloperGuidePage
        page={
          getDeveloperGuidePageDefinition(pathname, language) ??
          getDeveloperGuidePageDefinition(DEVELOPER_GUIDE_PATH, language)!
        }
      />
    );
  }

  return (
    <KeyboardLayoutProvider>
      <DeviceConnectionProvider>
        <StudioUnlockProvider>
          <AppContent />
        </StudioUnlockProvider>
      </DeviceConnectionProvider>
    </KeyboardLayoutProvider>
  );
}

function AppContent() {
  const connection = useContext(ConnectionContext);
  const { t } = useLanguage();
  const [urlTab, navigateToTab] = useUrlTab();
  const tabs = getTabs(t);
  const { isAvailable: isDevtoolAvailable } = useDevtool();
  const [devtoolOpen, setDevtoolOpen] = useState(false);
  const activeTab = tabs.some((tab) => tab.id === urlTab) ? urlTab : "home";

  // The release notes page is a standalone, connection-independent route so it
  // stays reachable from the splash screen and via GitHub Release deep links.
  const [pathname, setPathname] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const navigatePath = useCallback((path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    // Notify both this route state and useUrlTab's own popstate listener.
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);
  // Same as navigatePath but without a history entry, so Back never returns to
  // a URL carrying a spent OAuth authorization code.
  const replacePath = useCallback((path: string) => {
    window.history.replaceState(null, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);
  const onReleaseNotes = pathname === RELEASE_NOTES_PATH;
  const onOauthCallback = pathname === OAUTH_CALLBACK_PATH;

  useEffect(() => {
    // Canonicalize unknown paths (e.g. a stale/typo'd link) to the home tab,
    // but leave the standalone routes alone. The OAuth callback especially:
    // rewriting it to "/" would discard the ?code=&state= query string before
    // AbyssCallbackPage ever gets to read it.
    if (
      !onReleaseNotes &&
      !onOauthCallback &&
      urlTab !== activeTab &&
      window.location.pathname !== "/"
    ) {
      window.history.replaceState(null, "", "/");
    }
  }, [urlTab, activeTab, onReleaseNotes, onOauthCallback]);

  const setActiveTabWithTracking = useCallback(
    (tabId: string) => {
      // Google Analytics pageview tracking. The keyboard_connected /
      // keyboard_connect_failed events live in DeviceConnection, where the
      // connection method is known.
      trackPageView(
        tabs.find((tab) => tab.id === tabId)?.label || "Unknown",
        pathnameFromTabId(tabId),
      );
      navigateToTab(tabId);
    },
    [navigateToTab, tabs],
  );

  // Both standalone routes return before the connection gate: the user lands on
  // the OAuth callback with no keyboard connected whenever the popup was
  // blocked and the whole page navigated to Abyss.
  if (onOauthCallback) {
    return <AbyssCallbackPage onDone={replacePath} />;
  }

  if (onReleaseNotes) {
    return <ReleaseNotesPage onBack={() => navigatePath("/")} />;
  }

  return (
    <>
      <AnimatePresence>
        {connection.isReconnecting ? (
          <ReconnectingOverlay
            key="reconnecting"
            onCancel={connection.onCancelReconnect}
          />
        ) : (
          !connection.isConnected && (
            <motion.div
              key="splash"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SplashScreen
                onConnect={connection.onConnect}
                isConnecting={connection.isLoading}
                error={connection.error}
                onShowReleaseNotes={() => navigatePath(RELEASE_NOTES_PATH)}
                onShowDeveloperGuide={() => navigatePath(DEVELOPER_GUIDE_PATH)}
              />
            </motion.div>
          )
        )}
      </AnimatePresence>

      {connection.isConnected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="h-screen"
        >
          <AppLayout
            isConnected={connection.isConnected}
            deviceName={connection.deviceName}
            onConnect={connection.onConnect}
            onDisconnect={connection.onDisconnect}
            isConnecting={connection.isLoading}
          >
            <TabNavigation
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTabWithTracking}
            />
          </AppLayout>
        </motion.div>
      )}

      {connection.isConnected && isDevtoolAvailable && (
        <button
          className="fixed bottom-5 right-5 z-[9998] h-8 px-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-electric)] hover:border-[var(--color-electric)] hover:shadow-glow-electric-sm transition-all duration-200 flex items-center justify-center text-[10px] font-sans font-medium tracking-wide"
          onClick={() => setDevtoolOpen((v) => !v)}
          title={t("Debug Tool")}
          aria-label={t("Debug Tool")}
        >
          {t("Debug Tool")}
        </button>
      )}

      {connection.isConnected && isDevtoolAvailable && devtoolOpen && (
        <DevtoolWindow onClose={() => setDevtoolOpen(false)} />
      )}
    </>
  );
}

export default App;
