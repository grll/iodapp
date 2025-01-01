/**
 * Installer module for the main process.
 * It handles the installation of MCP servers from a given base64 iod.ai url.
 */

// ============================
// Imports
// ============================

import path from "node:path";
import os from "node:os";
import fs, { existsSync, mkdirSync } from "node:fs";
import http from "isomorphic-git/http/node";
import { BrowserWindow, app } from "electron";
import { clone } from "isomorphic-git";

import { AppError } from "../shared/error";
import { logger } from "../shared/logger";
import { sendToWindow } from "../shared/ipc";
import { DISCORD_URL } from "../shared/constants";

import {
  writeMCPServerConfig,
  restartClaudeDesktop,
  MCPServerConfig,
} from "./claude";

// ============================
// Type Definitions
// ============================

// type passed in base64 through the iod protocol.
type InstallConfig = {
  config: {
    [key: string]: MCPServerConfig;
  };
  git?: {
    repo_url: string;
    commit: string;
  };
};

// ============================
// Constants
// ============================

// define a home directory for iod. used to store app data (cloned mcp servers...)
// we create it if it doesn't exists and assume it exists in the rest of the codebase.
const IOD_HOME = path.join(os.homedir(), ".iod");
if (!existsSync(IOD_HOME)) {
  mkdirSync(IOD_HOME, { recursive: true });
}

// ============================
// Utility Functions
// ============================

/**
 * Parses the install config from a iod.ai url: iod://b64encodedjson
 * @param url - a iod.ai url to parse
 * @returns The install config see InstallConfig type
 * @throws AppError if the install config is invalid or couldnt be parsed
 */
function parseInstallConfigUrl(url: string) {
  try {
    const base64Data = url.replace("iod://", "");
    const jsonStr = Buffer.from(base64Data, "base64").toString("utf-8");
    const installConfig = JSON.parse(jsonStr) as InstallConfig;

    // for now we only support one mcp server to be installed at a time.
    if (Object.keys(installConfig.config).length !== 1) {
      throw new Error(
        "Invalid install config: number of servers in config must be exactly 1"
      );
    }

    return installConfig;
  } catch (error) {
    throw new AppError({
      developerMessage: `Failed to parse b64 data from '${url}' or invalid config send through 'iod://' protocol.`,
      userMessage: `We couldn't validate the install configuration for the MCP server.
      Join our discord for support: ${DISCORD_URL}`,
      originalError: error as Error,
    });
  }
}

/**
 * Clones a git repository into the IOD_HOME directory.
 * @param repoUrl - The url of the git repository
 * @param commit - The commit to clone at
 * @param repoName - The name of the repository
 * @returns The path to the directory created
 */
async function gitClone(repoUrl: string, commit: string, repoName: string) {
  try {
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

    return repoDir;
  } catch (error) {
    throw new AppError({
      developerMessage: `Failed to clone the git repository ${repoUrl} at commit ${commit}.`,
      userMessage: `We couldn't download the MCP server '${repoName}' on your computer.
      Join our discord for support: ${DISCORD_URL}`,
      originalError: error as Error,
    });
  }
}

/**
 * Resolves the name of binary packaged in the app (e.g. 'uv') into an absolute path.
 * @param binary - The binary name
 * @returns The binary absolute path
 * @throws Error if the returned path is not found
 */
function resolveBinaryPath(binary: string) {
  let execFolderPath = path.join(
    __dirname,
    "..",
    "..",
    "binaries",
    process.platform,
    process.arch
  );
  if (app.isPackaged) {
    // when packaged, the binaries are in the Resources folder of the app
    // we have to follow the way forge package the app to find the binaries
    // in this case it keeps the arch but not the rest like: Resources/x64/uv
    execFolderPath = path.join(process.resourcesPath, process.arch);
  }

  let execName = binary;
  if (process.platform === "win32") {
    execName += ".exe";
  }

  const binaryPath = path.join(execFolderPath, execName);
  if (!existsSync(binaryPath)) {
    throw new Error(`Binary ${binary} not found in ${binaryPath}`);
  }

  return binaryPath;
}

/**
 * Updates a MCP server arguments related to 'uv'. (if using 'uv', noop otherwise)
 * set python version with '--python' and fix '--directory' arg with the cloned repo path.
 * @param args - The args of the MCP server config
 * @param repoDir? - Absolute path to the cloned repository for that MCP server.
 * @returns A new args array updated
 * @throws Error if using uv --directory and repoDir is not provided.
 */
function updateUVArgs(args: string[], repoDir?: string) {
  const returnedArgs = Array.from(args);

  const uvIndex = args.indexOf("uv");
  if (uvIndex === -1) return returnedArgs;

  // Replace directory path with cloned directory if necessary
  const directoryFlagIndex = args.indexOf("--directory", uvIndex);
  if (directoryFlagIndex !== -1) {
    if (!repoDir) {
      throw new Error(
        "MCP Config is using uv --directory option but no path to a cloned repository directory was provided."
      );
    }
    returnedArgs[directoryFlagIndex + 1] = repoDir;
  }

  // we set python to 3.12 when using uv because it's the most compatible version today
  // uv resolves python first before the package required python version is resolved
  // which causes incompatibility error at runtime. This reduces it.
  returnedArgs.splice(uvIndex + 1, 0, "--python", "3.12");

  return returnedArgs;
}

/**
 * Updates a MCP server arguments related to 'uvx'. (if using 'uvx', noop otherwise)
 * set python version with '--python'.
 * @param args - The args of the MCP server config
 * @returns A new args array updated
 */
function updateUVXArgs(args: string[]) {
  const returnedArgs = Array.from(args);

  const uvxIndex = args.indexOf("uvx");
  if (uvxIndex === -1) return returnedArgs;

  return returnedArgs;
}

/**
 * Replaces binary commands with application-shipped binaries.
 * @param config - The MCPServerConfig to update.
 * @returns A new config with updated binaries
 */
function replaceBinaries(config: MCPServerConfig) {
  const binaries = ["uv", "uvx"];
  const returnedConfig = structuredClone(config);

  if (binaries.includes(config.command)) {
    returnedConfig.command = resolveBinaryPath(config.command);
  }

  returnedConfig.args = config.args.map((arg) =>
    binaries.includes(arg) ? resolveBinaryPath(arg) : arg
  );

  return returnedConfig;
}

/**
 * Fixes the MCP server config (paths, python / node version, ...)
 * @param config - The config to fix
 * @param repoDir? - Must be provided when the MCP server was cloned.
 * It will be used to set --directory for uv or --prefix for npm.
 * @returns The fixed config
 */
function fixConfig(config: MCPServerConfig, repoDir?: string) {
  let fixedConfig = structuredClone(config);

  let { args } = config;
  args = updateUVArgs(args, repoDir);
  args = updateUVXArgs(args);

  // TODO: update npm / npx args with fnm
  fixedConfig.args = args;

  // we replace binaries with binaries shipped with the app
  // to reduce dependencies on the user's system to a minimum
  // uv takes care of installing python env, fnm takes care of installing node/npm
  fixedConfig = replaceBinaries(fixedConfig);
  return fixedConfig;
}

// ============================
// Exported Functions
// ============================

/**
 * Installs MCP server on the Claude Desktop App from a given base64 iod.ai url.
 * it sends the following IPC events through mainWindow webContents if provided:
 * - `install-error`: to surface install errors to the user (in the renderer)
 * - `install-success`: to surface install success to the user (in the renderer)
 * @param url - The iod.ai url to install
 * @param mainWindow - The main window of the app to send messages to
 */
export async function install(url: string, mainWindow?: BrowserWindow) {
  let serverName: string | undefined = undefined;
  try {
    const installConfig = parseInstallConfigUrl(url);
    serverName = Object.keys(installConfig.config)[0];

    let repoDir: string | undefined = undefined;
    if (installConfig.git) {
      const { repo_url: repoUrl, commit } = installConfig.git;
      const repoName = repoUrl.split("/").pop();
      if (!repoName) {
        throw new Error("Failed to get repository name from url");
      }
      repoDir = await gitClone(repoUrl, commit, repoName);
    }

    const serverConfig = installConfig.config[serverName];
    const fixedServerConfig = fixConfig(serverConfig, repoDir);
    writeMCPServerConfig(serverName, fixedServerConfig);
    restartClaudeDesktop();

    if (mainWindow) {
      sendToWindow(mainWindow, 'notify', {
        type: 'success',
        title: "MCP Server Installation Success",
        message: `Successfully installed ${serverName} in your Claude Desktop App.`
      });
    }
  } catch (error) {
    if (error instanceof AppError) {
      logger.error(error.message, error.originalError);
      if (mainWindow) {
        sendToWindow(mainWindow, 'notify', {
          type: 'error',
          title: "MCP Server Installation Error",
          message: error.userMessage
        });
      }
    } else {
      logger.error("Unknown error during MCP server installation", error as Error);
      if (mainWindow) {
        sendToWindow(mainWindow, 'notify', {
          type: 'error',
          title: "MCP Server Installation Error",
          message: `Failed to install the MCP server '${serverName || "unknown"}' in your Claude Desktop App.
          Join our discord for more support: ${DISCORD_URL}`
        });
      }
    }
  }
}
