import {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  Menu,
  nativeImage,
  Tray
} from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { loadAppConfig } from "./main/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let tray;
let isListening = false;

function loadEnv() {
  const candidatePaths = [
    path.join(app.getPath("userData"), ".env"),
    path.join(process.cwd(), ".env"),
    path.join(path.dirname(process.execPath), ".env")
  ];

  candidatePaths.forEach((envPath) => {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  });
}

function createWindow() {
  nativeTheme.themeSource = "dark";

  mainWindow = new BrowserWindow({
    width: 180,
    height: 180,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.on("show", updateTrayMenu);
  mainWindow.on("hide", updateTrayMenu);
}

function createTray() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="92" stroke="#8ffaff" stroke-width="10" fill="none"/>
      <circle cx="100" cy="100" r="60" stroke="#8ffaff" stroke-width="6" fill="none"/>
      <line x1="100" y1="10" x2="100" y2="190" stroke="#8ffaff" stroke-width="6"/>
      <line x1="10" y1="100" x2="190" y2="100" stroke="#8ffaff" stroke-width="6"/>
      <line x1="40" y1="40" x2="160" y2="160" stroke="#8ffaff" stroke-width="6"/>
      <line x1="160" y1="40" x2="40" y2="160" stroke="#8ffaff" stroke-width="6"/>
    </svg>
  `;
  const icon = nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
  );
  tray = new Tray(icon);
  tray.setToolTip("V2");
  tray.on("click", () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
  updateTrayMenu();
}

function updateTrayMenu() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    {
      label: isListening ? "Stop Listening" : "Start Listening",
      click: () => {
        if (!mainWindow) return;
        mainWindow.webContents.send("v2:toggle-listening");
      }
    },
    {
      label: mainWindow?.isVisible() ? "Hide V" : "Show V",
      click: () => {
        if (!mainWindow) return;
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
        }
      }
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => app.quit()
    }
  ]);
  tray.setContextMenu(menu);
}

app.whenReady().then(() => {
  loadEnv();
  createWindow();
  createTray();

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

ipcMain.handle("v2:get-config", () => loadAppConfig());

ipcMain.handle("v2:set-visibility", (_event, visible) => {
  if (mainWindow) {
    if (visible) {
      mainWindow.show();
    } else {
      mainWindow.hide();
    }
  }
});

ipcMain.handle("v2:toggle-always-on-top", (_event, enabled) => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(Boolean(enabled));
  }
});

ipcMain.handle("v2:get-window-position", () => {
  if (!mainWindow) return { x: 0, y: 0 };
  const [x, y] = mainWindow.getPosition();
  return { x, y };
});

ipcMain.handle("v2:set-window-position", (_event, position) => {
  if (mainWindow && position) {
    mainWindow.setPosition(position.x, position.y);
  }
});

ipcMain.on("v2:listening-changed", (_event, listening) => {
  isListening = Boolean(listening);
  updateTrayMenu();
});
