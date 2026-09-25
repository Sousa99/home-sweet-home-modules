export const config = {
  serverName: 'bus-catcher',
  restPort: Number(process.env.PORT ?? 3000),
  mcpPort: Number(process.env.MCP_PORT ?? 3001),
  dbPath: process.env.DB_PATH ?? './data/bus-catcher.db',
  feedUrl: process.env.GTFS_URL ?? 'https://api.carrismetropolitana.pt/gtfs',
} as const;
