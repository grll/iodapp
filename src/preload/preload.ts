// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge } from "electron";

import { onInstallError, onInstallSuccess } from "./installer";

contextBridge.exposeInMainWorld("installer", {
  onInstallError,
  onInstallSuccess,
});

declare global {
  interface Window {
    installer: {
      onInstallError: typeof onInstallError;
      onInstallSuccess: typeof onInstallSuccess;
    };
  }
}