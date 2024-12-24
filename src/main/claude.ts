import { watch, readFileSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { BrowserWindow } from "electron";

export type MCPServerConfig = {
  command: string;
  args: string[];
  env: Record<string, string>;
};

export type ClaudeDesktopConfig = {
  mcpServers: {
    [serverName: string]: MCPServerConfig;
  };
  [key: string]: unknown;
};

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
if (!(process.platform in CONFIG_PATHS)) {
  throw new Error(`Unsupported platform: ${process.platform}`);
}
const CLAUDE_DESKTOP_CONFIG_PATH =
  CONFIG_PATHS[process.platform as keyof typeof CONFIG_PATHS];

// if config path does not exist, create it
if (!existsSync(CLAUDE_DESKTOP_CONFIG_PATH)) {
  writeFileSync(CLAUDE_DESKTOP_CONFIG_PATH, "{}");
}

export async function writeMCPServerConfig(
  serverName: string,
  serverConfig: MCPServerConfig
) {
  console.log("writeMCPServerConfig", serverName, serverConfig);
  // TODO: implement setMCPConfig
}

export async function restartClaudeDesktop() {
  // TODO: implement restart
}

export function watchClaudeDesktopConfig(mainWindow: BrowserWindow) {
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
