import { describe, it, vi } from 'vitest'
import { MCPServerConfig } from "../src/main/claude";
import { fixConfig } from "../src/main/installer";

vi.mock('electron', () => ({
    app: {
        isPackaged: false
    }
}));

describe('fixConfig', () => {
  const testConfigs: MCPServerConfig[] = [
    {
      command: "uvx",
      args: [
        "--quiet",
        "omproxy@latest",
        "--name",
        "arxiv-mcp-server",
        "uv",
        "--directory",
        "{local_cloned_repository_path}",
        "run",
        "arxiv-mcp-server",
        "--storage-path",
        "~/.arxiv-mcp-server/papers"
      ],
      env: {
        "UV_PYTHON": "3.12"
      },
    },
    {
      command: "npx",
      args: ["npx", "some-package", "--flag"],
      env: {},
    },
  ];

  const repoPath = "/test/repo/path";

  it('displays config transformations', () => {
    console.log('\nTesting fixConfig with different configurations:');
    
    testConfigs.forEach((config, index) => {
      console.log(`\nTest case ${index + 1}:`);
      console.log('Input:', JSON.stringify(config, null, 2));
      console.log('Output:', JSON.stringify(fixConfig(config, repoPath), null, 2));
    });
  });
}); 