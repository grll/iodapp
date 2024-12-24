import { ipcRenderer, IpcRendererEvent } from "electron";
import { ClaudeDesktopConfig } from "../main/claude";

export const onConfigChanged = (callback: (config: ClaudeDesktopConfig) => void) => {
  const listener = (_event: IpcRendererEvent, config: ClaudeDesktopConfig) => callback(config);
  ipcRenderer.on("config-changed", listener);
  return () => {ipcRenderer.removeListener("config-changed", listener)};
};

export const onConfigError = (callback: (error: string) => void) => {
  const listener = (_event: IpcRendererEvent, error: string) => callback(error);
  ipcRenderer.on("config-error", listener);
  return () => {ipcRenderer.removeListener("config-error", listener)};
};
