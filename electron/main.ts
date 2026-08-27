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
const bluetoothDevices = new Map<string, BluetoothDevice>();
const BLUETOOTH_DISCOVERY_TIMEOUT_MS = 6000;
const BLUETOOTH_DISCOVERY_SETTLE_MS = 800;

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
    detail: "If multiple ports are listed, pick the one that belongs to your DYA keyboard.",
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

  session.on(
    "select-serial-port",
    async (event, portList, contents, callback) => {
      if (contents !== window.webContents) {
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
    },
  );
}

function registerBluetoothHandlers(window: BrowserWindow) {
  window.webContents.on("select-bluetooth-device", async (event, devices, callback) => {
    event.preventDefault();

    pendingBluetoothCallback = callback;

    pendingBluetoothWindow = window;

    for (const device of devices) {
      bluetoothDevices.set(device.deviceId, device);
    }

    if (bluetoothPromptTimer) {
      clearTimeout(bluetoothPromptTimer);
    }

    const promptDelay = bluetoothDevices.size > 0
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

      if (!dialogWindow || !selectBluetoothDevice) {
        return;
      }

      let deviceId = "";

      try {
        deviceId = await promptForBluetoothDevice(dialogWindow, discoveredDevices);
      } catch (error) {
        console.error("Failed to choose Bluetooth device:", error);
      }

      selectBluetoothDevice(deviceId);
    }, promptDelay);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  registerSerialHandlers(mainWindow.webContents.session, mainWindow);
  registerBluetoothHandlers(mainWindow);

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
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