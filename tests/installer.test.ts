import { expect, test, vi, beforeEach, MockInstance } from "vitest";
import { BrowserWindow } from "electron";
import path from "node:path";
import os from "node:os";
import * as mockedFs from "node:fs";

import { install } from "../src/main/installer";
import { clone } from "isomorphic-git";
import { writeMCPServerConfig, restartClaudeDesktop, MCPServerConfig } from "../src/main/claude";

// Mocking isomorphic-git clone function
vi.mock("isomorphic-git", () => ({
  clone: vi.fn(),
}));

// Mocking fs functions used in installer.ts
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

// Mocking claude.ts functions
vi.mock("../src/main/claude", () => ({
  writeMCPServerConfig: vi.fn(),
  restartClaudeDesktop: vi.fn(),
}));

// Add mock for electron app
vi.mock("electron", () => ({
  BrowserWindow: vi.fn(),
  app: {
    isPackaged: false,
  },
}));

// Helper to create a mocked BrowserWindow
function createMockBrowserWindow() {
  return {
    webContents: {
      send: vi.fn(),
    },
  } as unknown as BrowserWindow;
}

beforeEach(() => {
  // Reset all mocks before each test
  vi.resetAllMocks();
});

test("install clones the repo and writes the correct config", async () => {
  // Arrange

  // Sample install config
  const installConfig = {
    config: {
      spotify: {
        command: "uvx",
        args: ["omproxy@latest", "uv", "--directory", "", "run", "spotify-mcp"],
        env: {
          NODE_ENV: "development",
        },
      },
    },
    git: {
      repo_url: "https://github.com/varunneal/spotify-mcp",
      commit: "036a87c146c7cfffccc1996c36ad178b5dd3f87f",
    },
  };

  // Encode installConfig as base64
  const jsonStr = JSON.stringify(installConfig);
  const base64Data = Buffer.from(jsonStr, "utf-8").toString("base64");
  const url = `iod://${base64Data}`;

  // Mock fs.existsSync to return true for IOD_HOME directory
  const IOD_HOME = path.join(os.homedir(), ".iod");
  const repoName = "spotify-mcp";

  (mockedFs.existsSync as unknown as MockInstance).mockImplementation((dirPath: string) => {
    if (dirPath === IOD_HOME) {
      return true;
    }

    // Return true for binary paths
    if (dirPath.includes('binaries') && (dirPath.endsWith('uvx') || dirPath.endsWith('uv'))) {
      return true;
    }

    return false;
  });

  // Mock isomorphic-git clone to resolve immediately
  (clone as unknown as MockInstance).mockResolvedValueOnce(undefined);

  // Create a mocked BrowserWindow
  const mockMainWindow = createMockBrowserWindow();

  // Act
  await install(url, mockMainWindow);

  // Assert

  // Verify clone was called with correct repo URL and commit
  expect(clone).toHaveBeenCalledWith(
    expect.objectContaining({
      url: installConfig.git.repo_url,
      ref: installConfig.git.commit,
      dir: path.join(IOD_HOME, repoName),
      singleBranch: true,
      depth: 1,
    })
  );

  // Verify writeMCPServerConfig was called with correct parameters
  const expectedConfig: Partial<MCPServerConfig> = {
    command: expect.stringContaining("uvx"), // Assuming resolveBinaryPath appends path
    args: expect.arrayContaining([
      "omproxy@latest",
      expect.stringContaining("uv"), // Resolved binary path for 'uv'
      "--python",
      "3.12",
      "--directory",
      path.join(IOD_HOME, repoName),
      "run",
      "spotify-mcp",
    ]),
    env: {
      NODE_ENV: "development",
    },
  };

  expect(writeMCPServerConfig).toHaveBeenCalledWith("spotify", expectedConfig);

  // Verify restartClaudeDesktop was called
  expect(restartClaudeDesktop).toHaveBeenCalled();

  // Verify IPC message for success was sent
  expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
    "notify",
    {
      type: "success",
      title: "MCP Server Installation Success",
      message: `Successfully installed spotify in your Claude Desktop App.`
    }
  );
});