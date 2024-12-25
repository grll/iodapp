import path from "node:path";
import os from "node:os";
import fs, { existsSync, mkdirSync } from "node:fs";
import http from "isomorphic-git/http/node";
import { BrowserWindow, app } from "electron";
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
 * @param repoName - The name of the repository
 */
async function gitClone(repoUrl: string, commit: string, repoName: string) {
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
 * Resolves the binary path from the app path
 * @param binary - The binary name
 * @returns The binary path
 */
function resolveBinaryPath(binary: string) {
  let basePath = path.join(__dirname, '..', '..');
  if (app.isPackaged) {
    basePath = path.join(app.getAppPath());
  }

  let execName = binary;
  if (process.platform === "win32") {
    execName += ".exe";
  }

  const binaryPath = path.join(basePath, "binaries", process.platform, process.arch, execName);
  if (!existsSync(binaryPath)) {
    throw new Error(`Binary ${binary} not found in ${binaryPath}`);
  }

  return binaryPath;
}

/**
 * Fixes the MCP server config (paths, python / node version, ...)
 * @param config - The config to fix
 * @param cloned - Whether the repository has been cloned
 * @param repoName? - The name of the repository must be provided if cloned is true
 * @returns The fixed config
 */
function fixConfig(config: MCPServerConfig, cloned: boolean, repoName?: string) {
  if (cloned && !repoName) {
    throw new Error("Repository name is required when cloning is enabled.");
  }

  // fix uv
  if (config.args && config.args.includes("uv")) {
    const uvIndex = config.args.indexOf("uv");

    // if using uv --directory option we need to replace the following arg with the previously cloned repo
    if (config.args[uvIndex + 1] === "--directory") {
      if (!cloned) {
        throw new Error(
          "MCP Config is using uv --directory option but the repository is not cloned."
        );
      }
      config.args[uvIndex + 2] = path.join(IOD_HOME, repoName);
    }

    // if using uv we set uv python to 3.12 as it's the most commonly supported version
    // it will also force uv to install and use python 3.12.
    // TODO: later we should infer the python version required from the TOML file
    config.args.splice(uvIndex + 1, 0, "--python", "3.12");
  }

  // fix uvx
  if (config.args && config.args.includes("uvx")) {
    const uvxIndex = config.args.indexOf("uvx");
    // if using uvx we set uvx python to 3.12 as it's the most commonly supported version
    // it will also force uvx to install and use python 3.12.
    // TODO: later we should infer the python version required from the TOML file
    config.args.splice(uvxIndex + 1, 0, "--python", "3.12");
  }

  // fixes for node / npm / npx
  // TODO: later

  // we replace binaries with binaries shipped with the app
  // to reduce dependencies on the user's system to a minimum
  // uv takes care of installing python env, fnm takes care of installing node
  const binaries = ["uv", "uvx"];
  if (binaries.includes(config.command)) {
    config.command = resolveBinaryPath(config.command);
  }
  config.args = config.args.map((arg) => {
    if (binaries.includes(arg)) {
      return resolveBinaryPath(arg);
    }
    return arg;
  });

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

    let cloned = false;
    let repoName = "";
    if (installConfig.git) {
      const { repo_url: repoUrl, commit } = installConfig.git;
      repoName = repoUrl.split("/").pop();
      await gitClone(repoUrl, commit, repoName);
      cloned = true;
    }

    const serverName = Object.keys(installConfig.config)[0];
    const serverConfig = installConfig.config[serverName];
    const fixedServerConfig = fixConfig(serverConfig, cloned, repoName);
    writeMCPServerConfig(serverName, fixedServerConfig);
    restartClaudeDesktop();

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
