export const config = {
  serverName: 'bus-catcher',
  restPort: Number(process.env.PORT ?? 3000),
  mcpPort: Number(process.env.MCP_PORT ?? 3001),
  dbPath: process.env.DB_PATH ?? './data/bus-catcher.db',
  feedUrl: process.env.GTFS_URL ?? 'https://api.carrismetropolitana.pt/gtfs',
  realtimeUrl: process.env.CM_REALTIME_URL ?? 'https://api.carrismetropolitana.pt/v2',
  realtimeTtlMs: Number(process.env.REALTIME_TTL_MS ?? 15_000),
  realtimeStaleAfterMs: Number(process.env.REALTIME_STALE_AFTER_MS ?? 90_000),
} as const;
