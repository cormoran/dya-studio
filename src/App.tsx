import { useAbyssSessionRenewal } from "./hooks/useAbyssSessionRenewal";
import { useContext, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconHome,
  IconKeyboard,
  IconPlugConnected,
  IconPointer,
  IconPuzzle,
  IconSettings,
  IconStethoscope,
  IconWand,
} from "@tabler/icons-react";

import { AboutPage } from "./pages/AboutPage";
import { ABOUT_PATH } from "./content/about";
import { SplashScreen } from "./components/SplashScreen";
import { ReleaseNotesPage, RELEASE_NOTES_PATH } from "./pages/ReleaseNotesPage";
import { ReconnectingOverlay } from "./components/ReconnectingOverlay";
import { DeviceConnectionProvider } from "./components/DeviceConnection";
import { ConnectionContext } from "./contexts/DeviceConnectionContext";
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
import { AbyssCallbackPage } from "./pages/AbyssCallbackPage";
import { OAUTH_CALLBACK_PATH } from "./lib/abyss/abyssOAuth";
import { useLanguage } from "./hooks/useLanguage";
import { usePageMetadata } from "./hooks/usePageMetadata";
import { useUrlTab, usePathname, pathnameFromTabId } from "./hooks/useUrlTab";
import { useDevtool } from "./hooks/useDevtool";
import { DevtoolWindow } from "./components/DevtoolWindow";
import { trackPageView } from "./lib/analytics";
import { DeveloperGuidePage } from "./components/developerGuide";
import {
  DEVELOPER_GUIDE_PATH,
  getDeveloperGuidePageDefinition,
  isDeveloperGuidePath,
} from "./content/developerGuide";

function getTabs(t: (key: string) => string, shellVisible: boolean): TabItem[] {
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
      content: <KeymapPage shellVisible={shellVisible} />,
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

/** Public entry does not initialize a keyboard; an activated session stays mounted. */
function AppRouter() {
  const { language } = useLanguage();
  const pathname = usePathname();
  useAbyssSessionRenewal(pathname !== ABOUT_PATH);
  const onPublicRoute =
    pathname === ABOUT_PATH ||
    isDeveloperGuidePath(pathname) ||
    pathname === RELEASE_NOTES_PATH ||
    pathname === OAUTH_CALLBACK_PATH;
  const [sessionActivated, setSessionActivated] = useState(!onPublicRoute);
  if (!onPublicRoute && !sessionActivated) {
    setSessionActivated(true);
  }

  usePageMetadata(pathname, language);

  const replacePath = useCallback((path: string) => {
    window.history.replaceState(null, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  return (
    <>
      {sessionActivated && (
        <div hidden={onPublicRoute}>
          <KeyboardLayoutProvider>
            <DeviceConnectionProvider>
              <StudioUnlockProvider visible={!onPublicRoute}>
                <AppContent visible={!onPublicRoute} />
              </StudioUnlockProvider>
            </DeviceConnectionProvider>
          </KeyboardLayoutProvider>
        </div>
      )}
      {pathname === ABOUT_PATH && <AboutPage />}
      {isDeveloperGuidePath(pathname) && (
        <DeveloperGuidePage
          page={
            getDeveloperGuidePageDefinition(pathname, language) ??
            getDeveloperGuidePageDefinition(DEVELOPER_GUIDE_PATH, language)!
          }
        />
      )}
      {pathname === RELEASE_NOTES_PATH && (
        <ReleaseNotesPage onBack={() => navigatePath("/")} />
      )}
      {pathname === OAUTH_CALLBACK_PATH && (
        <AbyssCallbackPage onDone={replacePath} />
      )}
    </>
  );
}

function navigatePath(path: string) {
  if (window.location.pathname !== path) {
    window.history.pushState(null, "", path);
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function AppContent({ visible }: { visible: boolean }) {
  const connection = useContext(ConnectionContext);
  const { t } = useLanguage();
  const [urlTab, navigateToTab] = useUrlTab();
  const tabs = getTabs(t, visible);
  const { isAvailable: isDevtoolAvailable } = useDevtool();
  const [devtoolOpen, setDevtoolOpen] = useState(false);
  const nextTab = tabs.some((tab) => tab.id === urlTab) ? urlTab : "home";
  // Public routes hide this shell without changing the selected editor tab.
  const [activeTab, setActiveTab] = useState(nextTab);
  if (visible && activeTab !== nextTab) {
    setActiveTab(nextTab);
  }

  useEffect(() => {
    // Keep standalone paths and OAuth's single-use query untouched.
    if (visible && urlTab !== nextTab && window.location.pathname !== "/") {
      window.history.replaceState(null, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [visible, urlTab, nextTab]);

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
                visible={visible}
                onConnect={connection.onConnect}
                isConnecting={connection.isLoading}
                error={connection.error}
                onShowAbout={() => navigatePath(ABOUT_PATH)}
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
          className="app-connected-shell"
        >
          <AppLayout
            isHome={activeTab === "home"}
            isConnected={connection.isConnected}
            deviceName={connection.deviceName}
            onConnect={connection.onConnect}
            onDisconnect={connection.onDisconnect}
            isConnecting={connection.isLoading}
          >
            <TabNavigation
              tabs={tabs}
              isActive={visible}
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

      {visible &&
        connection.isConnected &&
        isDevtoolAvailable &&
        devtoolOpen && <DevtoolWindow onClose={() => setDevtoolOpen(false)} />}
    </>
  );
}

export default App;
