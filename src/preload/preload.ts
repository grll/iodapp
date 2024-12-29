// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
/**
 * Preload script for the renderer process.
 * It exposes the IPC API to the renderer process.
 * 
 * We focus on simplicity and type safety without typeguards for now.
 * We expose 'ipc.on' for listening to events sent from the main process via 'mainWindow.webContents.send()'.
 * We expose 'ipc.invoke' for invoking functions on the main process via invoke / handle pattern.
 */
import { ipcRenderer, IpcRendererEvent, contextBridge } from "electron";
import type { MainToRendererSendChannels, IpcInvokeChannels, IpcResponse } from "../shared/ipc";


/**
 * Listen to events sent from the main process via 'mainWindow.webContents.send()'.
 * @param channel - The channel to listen to.
 * @param callback - The callback to call when the event is received.
 * @returns A function to remove the listener.
 */
const on = <T extends keyof MainToRendererSendChannels>(
  channel: T,
  callback: (args: MainToRendererSendChannels[T]) => void
): (() => void) => {
  const listener = (
    _event: IpcRendererEvent,
    args: MainToRendererSendChannels[T]
  ) => {
    callback(args);
  };
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
};

/**
 * Invoke a function on the main process via the invoke / handle pattern.
 * @param channel - The channel to invoke.
 * @param args - The arguments to pass to the function.
 * @returns A promise that resolves to the response of the function.
 * 
 * Note: the response is wrapped in an IpcResponse type to ensure consistency.
 */
const invoke = <T extends keyof IpcInvokeChannels>(
  channel: T,
  args: IpcInvokeChannels[T]["request"]
): Promise<IpcResponse<IpcInvokeChannels[T]["response"]>> => {
  return ipcRenderer.invoke(channel, args);
};

// IPC API interface exposed
interface IpcAPI {
  on: typeof on;
  invoke: typeof invoke;
}

// Expose API to renderer via contextBridge
contextBridge.exposeInMainWorld("ipc", {
  on,
  invoke,
} as IpcAPI);

// make sure the window object is typed with the IPC API.
declare global {
  interface Window {
    ipc: IpcAPI;
  }
}
