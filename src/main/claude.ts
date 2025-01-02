/**
 * Claude module for the main process.
 * It handles interactions with the Claude Desktop App in the main process.
 */

// ============================
// Imports
// ============================

import { watch, readFileSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

import type { BrowserWindow } from "electron";

import { AppError } from "../shared/error";
import { logger } from "../shared/logger";
import { sendToWindow } from "../shared/ipc";
import { DISCORD_URL } from "../shared/constants";
// ============================
// Type Definitions
// ============================

/**
 * The config object for a MCP server.
 */
export type MCPServerConfig = {
  command: string;
  args: string[];
  env: Record<string, string>;
};

/**
 * The config file format for the Claude Desktop App.
 */
export type ClaudeDesktopConfig = {
  mcpServers: {
    [serverName: string]: MCPServerConfig;
  };
  // we don't know what other fields are in the config file, so we add a catch-all field
  [key: string]: unknown;
};

// ============================
// Constants
// ============================

// set CLAUDE_DESKTOP_CONFIG_PATH to point to the config.json file based on the platform
const CONFIG_PATHS = {
  darwin: path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "Claude",
    "claude_desktop_config.json"
  ),
};

// ============================
// Utility Functions
// ============================

/**
 * Gets the absolute path to the Claude Desktop App config file based on the platform.
 * @returns the config path
 * @throws an error if the platform is not supported
 */
function getConfigPath() {
  if (!(process.platform in CONFIG_PATHS)) {
    throw new Error(
      `Unsupported platform. Claude Desktop App config path for platform '${process.platform}' not found.`
    );
  }
  return CONFIG_PATHS[process.platform as keyof typeof CONFIG_PATHS];
}

/**
 * The absolute path to the Claude Desktop App config file.
 */
const CLAUDE_DESKTOP_CONFIG_PATH = getConfigPath();

// if config path does not exist, create it
// we assume it exists in the rest of the codebase.
if (!existsSync(CLAUDE_DESKTOP_CONFIG_PATH)) {
  writeFileSync(CLAUDE_DESKTOP_CONFIG_PATH, "{}");
}

// ============================
// Exported Functions
// ============================

/**
 * Writes a MCP server config to the config file
 * @param serverName - the name of the server
 * @param serverConfig - the config to write
 * @throws an AppError if the server is not found or the config file is not found or is not a valid JSON file
 */
export function writeMCPServerConfig(
  serverName: string,
  serverConfig: MCPServerConfig
) {
  try {
    const config = readFileSync(CLAUDE_DESKTOP_CONFIG_PATH, "utf8");
    const jsonConfig = JSON.parse(config) as ClaudeDesktopConfig;
    jsonConfig.mcpServers[serverName] = serverConfig;
    writeFileSync(
      CLAUDE_DESKTOP_CONFIG_PATH,
      JSON.stringify(jsonConfig, null, 2)
    );
  } catch (error) {
    throw new AppError({
      developerMessage:
        "Failed to write MCP server config to the Claude Desktop App config file.",
      userMessage: `We failed to write MCP server '${serverName}' to your Claude Desktop App config file.
      We might not have proper access to the config file or the config file could be wrongly formatted.
      Join our discord for support: ${DISCORD_URL}`,
      originalError: error as Error,
    });
  }
}

/**
 * Restarts the Claude Desktop app
 * @returns the output of the restart command (stdout)
 * @throws an error if the platform is not supported
 * @throws an error if the restart command fails
 */
export function restartClaudeDesktop() {
  if (process.platform === "darwin") {
    const restartScript = `
      tell application "Claude"
        if its running then
          quit
          repeat while its running
            delay 0.1
          end repeat
        end if
        activate
      end tell
    `;
    return execSync(`osascript -e '${restartScript}'`).toString();
  }

  throw new Error(
    `Restarting Claude Desktop is not supported on this platform: ${process.platform}`
  );
}

/**
 * Watches the Claude Desktop config file and sends a message to the main window when it changes.
 * In case of error reading or parsing the config file, it sends an error message to the main window using the 'config-error' channel.
 * @param mainWindow - the main window
 * @returns a function to unwatch the config file or false if the config file does not exist.
 */
export function watchClaudeDesktopConfig(mainWindow: BrowserWindow) {
  if (!existsSync(CLAUDE_DESKTOP_CONFIG_PATH)) {
    logger.error(
      `Claude Desktop App config file not found at '${CLAUDE_DESKTOP_CONFIG_PATH}'`
    );
    return false;
  }

  const watcher = watch(CLAUDE_DESKTOP_CONFIG_PATH);

  watcher.on("change", (event) => {
    if (event !== "change") return;

    try {
      const config = readFileSync(CLAUDE_DESKTOP_CONFIG_PATH, "utf8");
      const jsonConfig = JSON.parse(config) as ClaudeDesktopConfig;
      sendToWindow(mainWindow, "claude:config-changed", { config: jsonConfig });
    } catch (error) {
      logger.error(
        "Failed to read / parse the Claude Desktop App config file",
        error as Error
      );
      sendToWindow(mainWindow, "notify", {
        type: "error",
        title: "Claude Desktop App Config Error",
        message: `We detected a change in your Claude Desktop App config but failed to read it.
          Your config might be wrongly formatted or we do not have access to the config file.
          Join our discord for support: ${DISCORD_URL}`,
      });
    }
  });

  return () => {
    watcher.close();
  };
}

/**
 * Gets the MCP servers from the Claude Desktop App config file.
 * @returns the MCP servers
 * @throws An AppError if the config file is not found or is not a valid JSON file
 */
export function getMCPServers() {
  try {
    const config = readFileSync(CLAUDE_DESKTOP_CONFIG_PATH, "utf8");
    const jsonConfig = JSON.parse(config) as ClaudeDesktopConfig;

    // initially, the config file might not have the mcpServers field.
    if (!jsonConfig.mcpServers) {
      return {};
    }

    return jsonConfig.mcpServers;
  } catch (error) {
    throw new AppError({
      developerMessage:
        "Failed to read or parse the Claude Desktop App config file.",
      userMessage: `We failed to retrieve MCP servers from your Claude Desktop App config file.
      We might not have access to the config file or the config file could be wrongly formatted.
      Join our discord for support: ${DISCORD_URL}
      `,
      originalError: error as Error,
    });
  }
}

/**
 * Deletes an MCP server from the Claude Desktop App config file.
 * @param serverName - the name of the server to delete
 * @throws an AppError if the server is not found or the config file is not found or is not a valid JSON file
 */
export function deleteMCPServer({ serverName }: { serverName: string }) {
  try {
    const config = readFileSync(CLAUDE_DESKTOP_CONFIG_PATH, "utf8");
    const jsonConfig = JSON.parse(config) as ClaudeDesktopConfig;
    delete jsonConfig.mcpServers[serverName];
    writeFileSync(
      CLAUDE_DESKTOP_CONFIG_PATH,
      JSON.stringify(jsonConfig, null, 2)
    );
  } catch (error) {
    throw new AppError({
      developerMessage:
        "Failed to delete MCP server from the Claude Desktop App config file.",
      userMessage: `We failed to delete MCP server '${serverName}' from your Claude Desktop App config file.
      We might not have access to the config file or the config file could be wrongly formatted.
      Join our discord for support: ${DISCORD_URL}`,
      originalError: error as Error,
    });
  }
}
