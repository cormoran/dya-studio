import { app, BrowserWindow, dialog, shell } from "electron";
import type { BluetoothDevice, SerialPort, Session } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let pendingBluetoothCallback: ((deviceId: string) => void) | null = null;
let pendingBluetoothWindow: BrowserWindow | null = null;
let bluetoothPromptTimer: NodeJS.Timeout | null = null;
let isPromptingBluetooth = false;
const bluetoothDevices = new Map<string, BluetoothDevice>();
const BLUETOOTH_DISCOVERY_TIMEOUT_MS = 6000;
const BLUETOOTH_DISCOVERY_SETTLE_MS = 800;
const ALLOWED_EXTERNAL_PROTOCOLS = new Set(["https:", "http:", "mailto:"]);

function isAllowedExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

function cancelPendingBluetoothSelection() {
  if (bluetoothPromptTimer) {
    clearTimeout(bluetoothPromptTimer);
    bluetoothPromptTimer = null;
  }

  pendingBluetoothCallback?.("");
  pendingBluetoothCallback = null;
  pendingBluetoothWindow = null;
  bluetoothDevices.clear();
}

function formatSerialPortLabel(port: SerialPort) {
  return [
    port.displayName,
    port.portName,
    port.vendorId && port.productId
      ? `VID:${port.vendorId} PID:${port.productId}`
      : undefined,
  ]
    .filter(Boolean)
    .join(" - ");
}

function formatBluetoothDeviceLabel(device: BluetoothDevice) {
  return device.deviceName || device.deviceId;
}

async function promptForSerialPort(
  window: BrowserWindow,
  ports: SerialPort[],
): Promise<string> {
  if (ports.length === 0) {
    await dialog.showMessageBox(window, {
      type: "warning",
      title: "No Serial Ports Found",
      message: "No serial ports are currently available.",
      detail:
        "Reconnect the keyboard, unlock ZMK Studio if needed, then try Connect via USB again.",
      buttons: ["OK"],
      defaultId: 0,
    });
    return "";
  }

  const buttons = [...ports.map(formatSerialPortLabel), "Cancel"];
  const { response } = await dialog.showMessageBox(window, {
    type: "question",
    title: "Select USB Serial Port",
    message: "Choose the keyboard serial port to connect.",
    detail:
      "If multiple ports are listed, pick the one that belongs to your DYA keyboard.",
    buttons,
    cancelId: ports.length,
    defaultId: 0,
    noLink: true,
  });

  return response < ports.length ? ports[response].portId : "";
}

async function promptForBluetoothDevice(
  window: BrowserWindow,
  devices: BluetoothDevice[],
): Promise<string> {
  if (devices.length === 0) {
    await dialog.showMessageBox(window, {
      type: "warning",
      title: "No Bluetooth Devices Found",
      message: "No compatible Bluetooth devices are currently discoverable.",
      detail:
        "Put the keyboard into discoverable mode, press the studio unlock key if required, then try Connect via Bluetooth again.",
      buttons: ["OK"],
      defaultId: 0,
    });
    return "";
  }

  const buttons = [...devices.map(formatBluetoothDeviceLabel), "Cancel"];
  const { response } = await dialog.showMessageBox(window, {
    type: "question",
    title: "Select Bluetooth Device",
    message: "Choose the keyboard Bluetooth device to connect.",
    detail:
      "If multiple devices are listed, pick the one that belongs to your DYA keyboard.",
    buttons,
    cancelId: devices.length,
    defaultId: 0,
    noLink: true,
  });

  return response < devices.length ? devices[response].deviceId : "";
}

function registerSerialHandlers(session: Session, window: BrowserWindow) {
  session.setPermissionCheckHandler((_webContents, permission) => {
    if (permission === "serial") {
      return true;
    }

    return false;
  });

  const handleSelectSerialPort = async (
    event: Electron.Event,
    portList: SerialPort[],
    contents: Electron.WebContents,
    callback: (portId: string) => void,
  ) => {
    if (window.isDestroyed() || contents !== window.webContents) {
      return;
    }

    event.preventDefault();
    cancelPendingBluetoothSelection();

    let portId = "";

    try {
      portId = await promptForSerialPort(window, portList);
    } catch (error) {
      console.error("Failed to choose serial port:", error);
    }

    callback(portId);
  };

  session.on("select-serial-port", handleSelectSerialPort);
  window.once("closed", () => {
    session.off("select-serial-port", handleSelectSerialPort);
  });
}

function registerBluetoothHandlers(window: BrowserWindow) {
  window.webContents.on(
    "select-bluetooth-device",
    async (event, devices, callback) => {
      event.preventDefault();
      if (window.isDestroyed() || isPromptingBluetooth) {
        return;
      }

      pendingBluetoothCallback = callback;

      pendingBluetoothWindow = window;

      for (const device of devices) {
        bluetoothDevices.set(device.deviceId, device);
      }

      if (bluetoothPromptTimer) {
        clearTimeout(bluetoothPromptTimer);
      }

      const promptDelay =
        bluetoothDevices.size > 0
          ? BLUETOOTH_DISCOVERY_SETTLE_MS
          : BLUETOOTH_DISCOVERY_TIMEOUT_MS;

      bluetoothPromptTimer = setTimeout(async () => {
        const dialogWindow = pendingBluetoothWindow;
        const selectBluetoothDevice = pendingBluetoothCallback;
        const discoveredDevices = Array.from(bluetoothDevices.values());

        bluetoothPromptTimer = null;
        pendingBluetoothWindow = null;
        pendingBluetoothCallback = null;
        bluetoothDevices.clear();

        if (
          !dialogWindow ||
          dialogWindow.isDestroyed() ||
          !selectBluetoothDevice
        ) {
          selectBluetoothDevice?.("");
          return;
        }

        let deviceId = "";
        isPromptingBluetooth = true;

        try {
          deviceId = await promptForBluetoothDevice(
            dialogWindow,
            discoveredDevices,
          );
        } catch (error) {
          console.error("Failed to choose Bluetooth device:", error);
        } finally {
          isPromptingBluetooth = false;
        }

        selectBluetoothDevice(deviceId);
      }, promptDelay);
    },
  );
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow = window;

  window.once("closed", () => {
    if (pendingBluetoothWindow === window) {
      cancelPendingBluetoothSelection();
    }
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

  registerSerialHandlers(window.webContents.session, window);
  registerBluetoothHandlers(window);

  if (isDev) {
    window.loadURL("http://localhost:5173");
    window.webContents.openDevTools();
  } else {
    window.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) {
      void shell.openExternal(url);
    } else {
      console.warn("Blocked opening disallowed external URL:", url);
    }
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
