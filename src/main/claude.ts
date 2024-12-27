// ============================
// Imports
// ============================

import { watch, readFileSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { BrowserWindow } from "electron";

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
 */
export function writeMCPServerConfig(
  serverName: string,
  serverConfig: MCPServerConfig
) {
  const config = readFileSync(CLAUDE_DESKTOP_CONFIG_PATH, "utf8");
  const jsonConfig = JSON.parse(config) as ClaudeDesktopConfig;
  jsonConfig.mcpServers[serverName] = serverConfig;
  writeFileSync(
    CLAUDE_DESKTOP_CONFIG_PATH,
    JSON.stringify(jsonConfig, null, 2)
  );
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
 * @returns a function to unwatch the config file
 */
export function watchClaudeDesktopConfig(mainWindow: BrowserWindow) {
  if (!existsSync(CLAUDE_DESKTOP_CONFIG_PATH)) {
    console.error(
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
      mainWindow.webContents.send("config-changed", jsonConfig);
    } catch (error) {
      mainWindow.webContents.send(
        "config-error",
        "We detected a change in Claude Desktop App config but failed to read it. Your config might be wrongly formatted or iod do not have access to the config file."
      );
      console.error(error);
    }
  });

  return () => {
    watcher.close();
  };
}
