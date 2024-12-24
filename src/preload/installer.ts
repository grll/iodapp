import { ipcRenderer, IpcRendererEvent } from "electron";

export const onInstallError = (callback: (error: string) => void) => {
  const listener = (_event: IpcRendererEvent, error: string) => callback(error);
  ipcRenderer.on("install-error", listener);
  return () => {ipcRenderer.removeListener("install-error", listener)};
};

export const onInstallSuccess = (callback: (message: string) => void) => {
  const listener = (_event: IpcRendererEvent, message: string) => callback(message);
  ipcRenderer.on("install-success", listener);
  return () => {ipcRenderer.removeListener("install-success", listener)};
};
