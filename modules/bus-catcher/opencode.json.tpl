{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "{{MODULE_SLUG}}": {
      "type": "remote",
      "url": "http://localhost:3001/mcp",
      "enabled": false
    },
    "github": {
      "type": "remote",
      "url": "https://api.githubcopilot.com/mcp/",
      "enabled": true,
      "oauth": false,
      "headers": {
        "Authorization": "Bearer {env:GITHUB_PERSONAL_ACCESS_TOKEN}",
        "X-MCP-Toolsets": "default,actions"
      }
    }
  },
  "tools": {
    "github_*": false
  },
  "agent": {
    "github-helper": {
      "description": "Handles GitHub operations: repositories, issues, pull requests, and Actions/CI runs via the GitHub MCP server. Delegate any GitHub task to this agent.",
      "mode": "subagent",
      "tools": {
        "github_*": true
      }
    }
  }
}