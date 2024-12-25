import path from "node:path";
import os from "node:os";
import fs, { existsSync, mkdirSync } from "node:fs";
import http from "isomorphic-git/http/node";
import { BrowserWindow } from "electron";
import { clone } from "isomorphic-git";

import {
  writeMCPServerConfig,
  restartClaudeDesktop,
  MCPServerConfig,
} from "./claude";

type InstallConfig = {
  config: {
    [key: string]: MCPServerConfig;
  };
  git?: {
    repo_url: string;
    commit: string;
  };
};

// home directory of the iod app stores git clone and other app data.
const IOD_HOME = path.join(os.homedir(), ".iod");
if (!existsSync(IOD_HOME)) {
  mkdirSync(IOD_HOME, { recursive: true });
}

/**
 * Parses the install config from a iod.ai url: iod://b64encodedjson
 * @param url - a iod.ai url to parse
 * @returns The install config see InstallConfig type
 * @throws Error if the install config is invalid
 */
function parseInstallConfigUrl(url: string) {
  const base64Data = url.replace("iod://", "");
  const jsonStr = Buffer.from(base64Data, "base64").toString("utf-8");
  const installConfig = JSON.parse(jsonStr) as InstallConfig;

  // ensure only one server is being configured at a time.
  if (Object.keys(installConfig.config).length !== 1) {
    throw new Error(
      "Invalid install config: number of servers in config must be 1"
    );
  }

  return installConfig;
}

/**
 * Clones a git repository into the tmp directory
 * @param repoUrl - The url of the git repository
 * @param commit - The commit to clone
 */
async function gitClone(repoUrl: string, commit: string) {
  const repoName = repoUrl.split("/").pop();
  const repoDir = path.join(IOD_HOME, repoName);

  await clone({
    fs,
    http,
    dir: repoDir,
    url: repoUrl,
    ref: commit,
    singleBranch: true,
    depth: 1,
  });
}

/**
 * Fixes the MCP server config (paths, python / node version, ...)
 * @param config - The config to fix
 * @returns The fixed config
 */
function fixConfig(config: MCPServerConfig) {
  // TODO: implement path config fix
  // TODO: use path from binaries shipped with the app for uv, node, python
  // TODO: infer python version from toml to set --python option uv
  return config;
}

/**
 * Installs MCP server on the Claude Desktop App from a given base64 iod.ai url.
 * it sends the following IPC events through mainWindow webContents if provided:
 * - `install-error`: to surface install errors to the user (in the renderer)
 * - `install-success`: to surface install success to the user (in the renderer)
 * @param url - The iod.ai url to install
 * @param mainWindow - The main window of the app to send messages to
 */
export async function install(url: string, mainWindow?: BrowserWindow) {
  try {
    const installConfig = parseInstallConfigUrl(url);

    if (installConfig.git) {
      const { repo_url: repoUrl, commit } = installConfig.git;
      await gitClone(repoUrl, commit);
    }

    const serverName = Object.keys(installConfig.config)[0];
    const serverConfig = installConfig.config[serverName];
    const fixedServerConfig = fixConfig(serverConfig);
    await writeMCPServerConfig(serverName, fixedServerConfig);
    await restartClaudeDesktop();

    if (mainWindow) {
      mainWindow.webContents.send(
        "install-success",
        `Successfully installed ${serverName} in your Claude Desktop App.`
      );
    }
  } catch (error) {
    if (mainWindow) {
      mainWindow.webContents.send(
        "install-error",
        "Failed to install the MCP server in your Claude Desktop App."
      );
    }
    console.error(error);
  }
}
