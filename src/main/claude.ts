
type MCPServerConfig = {
    [K in string]: {
        command: string
        args: string[]
        env: Record<string, string>
    }
}

export async function writeMCPServerConfig(serverConfig: MCPServerConfig) {
    // TODO: implement setMCPConfig
}

export async function restartClaudeDesktop() {
  // TODO: implement restart
}

