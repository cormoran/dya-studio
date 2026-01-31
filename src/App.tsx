import { useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconBattery2,
  IconBluetooth,
  IconHeartRateMonitor,
  IconKeyboard,
  IconPointer,
  IconSettings,
} from "@tabler/icons-react";

import { SplashScreen } from "./components/SplashScreen";
import {
  DeviceConnectionProvider,
  ConnectionContext,
} from "./components/DeviceConnection";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TabNavigation } from "./components/TabNavigation";
import type { TabItem } from "./components/TabNavigation";
import { AppLayout } from "./layouts/AppLayout";
import { BatteryPage } from "./pages/BatteryPage";
import { BLEConnectionsPage } from "./pages/BLEConnectionsPage";
import { HealthCheckPage } from "./pages/HealthCheckPage";
import { KeymapPage } from "./pages/KeymapPage";
import { TrackballPage } from "./pages/TrackballPage";
import { SettingsPage } from "./pages/SettingsPage";

const tabs: TabItem[] = [
  {
    id: "battery",
    label: "Battery",
    icon: <IconBattery2 size={18} />,
    content: <BatteryPage />,
  },
  {
    id: "ble",
    label: "BLE",
    icon: <IconBluetooth size={18} />,
    content: <BLEConnectionsPage />,
  },
  {
    id: "health",
    label: "Health",
    icon: <IconHeartRateMonitor size={18} />,
    content: <HealthCheckPage />,
  },
  {
    id: "keymap",
    label: "Keymap",
    icon: <IconKeyboard size={18} />,
    content: <KeymapPage />,
  },
  {
    id: "trackball",
    label: "Trackball",
    icon: <IconPointer size={18} />,
    content: <TrackballPage />,
  },
  {
    id: "settings",
    label: "Settings",
    icon: <IconSettings size={18} />,
    content: <SettingsPage />,
  },
];

function App() {
  return (
    <ThemeProvider>
      <DeviceConnectionProvider>
        <AppContent />
      </DeviceConnectionProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const connection = useContext(ConnectionContext);
  const [activeTab, setActiveTab] = useState("battery");

  return (
    <>
      <AnimatePresence>
        {!connection.isConnected && (
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
            />
          </motion.div>
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
            healthStatus={connection.healthStatus}
          >
            <TabNavigation
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </AppLayout>
        </motion.div>
      )}
    </>
  );
}

export default App;
