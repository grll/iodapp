import { app, BrowserWindow } from "electron";
import path from "path";
import started from "electron-squirrel-startup";

import { install } from "./installer";
import { watchClaudeDesktopConfig } from "./claude";

// we use iod:// protocol to send data from iod.ai to the app.
const PROTOCOL_PREFIX = "iod";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow;

/**
 * Registers the iod:// protocol with the application.
 * see: https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app
 */
function registerProtocol() {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL_PREFIX, process.execPath, [
        path.resolve(process.argv[1]),
      ]);
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL_PREFIX);
  }
}

/**
 * Creates the main application window.
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Load the appropriate URL based on the environment.
  const devServerURL = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL;
  const viteName = process.env.MAIN_WINDOW_VITE_NAME;
  if (devServerURL) {
    mainWindow.loadURL(devServerURL);
  } else if (viteName) {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${viteName}/index.html`)
    );
  } else {
    throw new Error("MAIN_WINDOW_VITE_NAME is not defined.");
  }

  // Open the DevTools.
  // TODO: remove this in PROD
  mainWindow.webContents.openDevTools();

  // Watch for config changes.
  const unwatch = watchClaudeDesktopConfig(mainWindow);
  mainWindow.on("close", () => {
    if (unwatch) {
      unwatch();
    }
  });
}

/**
 * Handles second-instance event for single instance applications.
 * @param commandLine - The command line arguments.
 */
function handleSecondInstance(commandLine: string[]) {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }

  const url = commandLine.pop()?.replace(/\/$/, ''); // Remove trailing slash if any
  if (url) {
    install(url, mainWindow);
  }
}

/**
 * Handles open-url event for macOS.
 * @param url - The URL to handle.
 */
function handleOpenUrl(url: string) {
  install(url, mainWindow);
}

// Handle single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("ready", () => {
    registerProtocol();
    createWindow();
  });

  // Handle second instance for Windows/Linux
  app.on("second-instance", (_event, commandLine) => {
    handleSecondInstance(commandLine);
  });

  // Handle open-url for macOS
  app.on("open-url", (_event, url) => {
    handleOpenUrl(url);
  });

  // Quit when all windows are closed, except on macOS.
  // There, it's common for applications and their menu bar to stay active 
  // until the user quits explicitly with Cmd + Q.
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    // Re-create a window in the app when the dock icon is clicked and there are no other windows open.
    // This is useful for macOS where the app can be launched from the dock.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}
