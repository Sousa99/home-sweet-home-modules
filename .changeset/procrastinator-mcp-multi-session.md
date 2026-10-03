---
"@sousa99/procrastinator-tracker-components": patch
---

Fix the MCP server to support multiple clients and reconnects: each client now gets
its own `McpServer` + transport session (tracked by the generated session id) instead
of a single shared server that rejected a second initialize with
"Server already initialized".