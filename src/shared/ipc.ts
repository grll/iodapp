/**
 * Type-safe IPC channels definitions for Electron's Main and Preload.
 * 
 * supports: 
 * - send channels to send from main to renderer via mainWindow.webContents.send()
 * - invoke / handle channels to send from renderer to main via ipcRenderer.invoke() and ipcMain.handle()
 */
import type { BrowserWindow } from "electron";
import type { ClaudeDesktopConfig, MCPServerConfig } from "../main/claude";
import { AppError } from "./error";
import { logger } from "./logger";

/**
 * Channels that the main process can use to send messages to the renderer process.
 * (e.g., via mainWindow.webContents.send)
 */
export interface MainToRendererSendChannels {
  /**
   * Notify the renderer of an error, info, or success message from the main process.
   * This should be displayed in a toast notification to the user.
   */
  notify: {
    type: "error" | "info" | "success";
    title?: string;
    message: string;
  };

  /**
   * Notify the renderer of a change in the Claude config.
   * Directly inform the renderer of the new config to update the UI.
   */
  "claude:config-changed": {
    config: ClaudeDesktopConfig;
  };
}

/**
 * Send a message from main to renderer to a specific window via IPC.
 * This method should be preferred as it is correctly typed.
 * @param window - The window to send the message to.
 * @param channel - The channel to send the message on.
 * @param args - The arguments to send.
 */
export function sendToWindow<T extends keyof MainToRendererSendChannels>(
  window: BrowserWindow,
  channel: T,
  args: MainToRendererSendChannels[T]
): void {
  window.webContents.send(channel, args);
}

/**
 * All IPC responses in the invoke / handle pattern should be of this type.
 * It allows to easily handle errors and success cases in the renderer afterward.
 * @param T - The type of the data returned by the IPC call.
 */
export interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Channels used for invoke/handle patterns.
 * Each key is a channel, with request and response types.
 * 
 * Note: the response will be wrapped in an IPCResponse<T> type.
 */
export interface IpcInvokeChannels {
  /**
   * Get the list of MCP servers from the main process.
   */
  "claude:get-mcp-servers": {
    request: void;
    response: { [serverName: string]: MCPServerConfig; };
  };

  /**
   * Delete an MCP server from the main process.
   */
  "claude:delete-mcp-server": {
    request: {
      /**
       * The name (key) of the MCP server to delete.
       */
      serverName: string;
    };
    response: void;
  };
}

/**
 * Type for a handler of an IPC channel following invoke/handle pattern.
 * it wraps the response in an IpcResponse<T> type for consistency.
 * @param T - The channel to handle.
 * @param args - The arguments to pass to the handler.
 * @returns A promise that resolves to the response of the handler.
 */
export type IpcHandler<T extends keyof IpcInvokeChannels> = (
  args: IpcInvokeChannels[T]["request"]
) => Promise<IpcResponse<IpcInvokeChannels[T]["response"]>>;

/**
 * Type for a handler of an IPC channel following invoke/handle pattern.
 * It is a pure function (not wrapped in an IpcResponse type) that returns a promise or the response directly.
 * @param T - The channel to handle.
 * @param args - The arguments to pass to the handler.
 * @returns A promise that resolves to the response of the handler.
 */
export type Handler<T extends keyof IpcInvokeChannels> = (
  args: IpcInvokeChannels[T]["request"]
) => Promise<IpcInvokeChannels[T]["response"]> | IpcInvokeChannels[T]["response"];

/**
 * Type for a map of handlers for all IPC channels.
 * this type make sure all defined Invoked channels are handled.
 * @param T - The channel to handle.
 * @param args - The arguments to pass to the handler.
 * @returns A promise that resolves to the response of the handler.
 */
export type Handlers = {
  [channel in keyof IpcInvokeChannels]: Handler<channel>;
}

/**
 * Creates an IPC handler for a given 'handler' function.
 * it makes sure to wrap the handler in an IpcResponse type for consistency.
 * @param fn - The function to create an IPC handler for.
 * @returns An IPC handler for the given function.
 */
export function createIpcHandler<T extends keyof IpcInvokeChannels>(
  fn: (
    args: IpcInvokeChannels[T]["request"]
  ) =>
    | IpcInvokeChannels[T]["response"]
    | Promise<IpcInvokeChannels[T]["response"]>
): IpcHandler<T> {
  return async (args: IpcInvokeChannels[T]["request"]) => {
    try {
      const data = await fn(args);
      return { success: true, data };
    } catch (error) {
      if (error instanceof AppError) {
        logger.error(error.message, error.originalError);
        return { success: false, error: error.userMessage };
      } else {
        logger.error("Caught an unexpected error", error as Error);
        return { success: false, error: "An unexpected error occurred" };
      }
    }
  };
}