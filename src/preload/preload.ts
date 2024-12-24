// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge } from "electron";

import { onInstallError, onInstallSuccess } from "./installer";
import { onConfigChanged, onConfigError } from "./claude";

contextBridge.exposeInMainWorld("installer", {
  onInstallError,
  onInstallSuccess,
});

contextBridge.exposeInMainWorld("claude", {
  onConfigChanged,
  onConfigError,
});

declare global {
  interface Window {
    installer: {
      onInstallError: typeof onInstallError;
      onInstallSuccess: typeof onInstallSuccess;
    };
    claude: {
      onConfigChanged: typeof onConfigChanged;
      onConfigError: typeof onConfigError;
    };
  }
}
