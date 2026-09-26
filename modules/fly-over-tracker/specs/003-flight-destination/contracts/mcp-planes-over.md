# Contract: MCP Tool — `planes_over` (updated)

**Interface**: MCP (Streamable HTTP, port **3001**), served at `/mcp`
**Server name**: `fly-over-tracker` | **Framework**: `createMcpHonoApp` + `createMcpHandler` factory

Compatible with the module's `opencode.json` remote entry:

```json
{
  "mcp": {
    "fly-over-tracker": {
      "type": "remote",
      "url": "http://localhost:3001/mcp",
      "enabled": false
    }
  }
}
```

## Tool: `planes_over`

Returns the aircraft currently over a GPS point + radius, using the same `FlyOverResult` shape
as the REST endpoint (parity by construction — same zod schemas and shared service). The result
now includes populated destination fields and the `destinationEnrichment` indicator.

### Input Schema (shared `LocationQuerySchema`)

Unchanged:

| Field | Type | Required | Constraint |
|-------|------|----------|-----------|
| `lat` | number | yes | `-90 ≤ lat ≤ 90` |
| `lng` | number | yes | `-180 ≤ lng ≤ 180` |
| `radiusKm` | number | yes | `0 < radiusKm ≤ maxRadiusKm` (default max 500) |

### Result

The tool returns the `FlyOverResult` serialized as JSON in a single `text` content item, e.g.:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"center\":{\"lat\":48.8566,\"lng\":2.3522},\"radiusKm\":50,\"asOf\":1726900000,\"count\":1,\"destinationEnrichment\":\"complete\",\"aircraft\":[{\"icao24\":\"3c6444\",\"callsign\":\"DLH400\",\"originCountry\":\"Germany\",\"destinationAirport\":\"EDDF\",\"destinationCountry\":\"Germany\",\"latitude\":48.9211,\"longitude\":2.4288,\"altitude\":9144.0,\"onGround\":false,\"velocity\":251.2,\"trueTrack\":87.5,\"verticalRate\":0.0,\"distanceKm\":8.2}]}"
    }
  ]
}
```

- `destinationEnrichment`: `'complete'` | `'partial'` | `'unavailable'` (see `data-model.md`).
- `destinationAirport` / `destinationCountry`: `null` when not identified or when enrichment is
  `'partial'`/`'unavailable'`.

### Errors

- **Invalid input** (schema failure): MCP tool-call error with a clear message describing the
  invalid field(s).
- **Feed unavailable / rate-limited**: MCP tool-call error with a clear "feed temporarily
  unavailable" message. The backend retries bounded attempts on `429` (honoring
  `X-Rate-Limit-Retry-After-Seconds` or a default) and refreshes the token once on `401` before
  surfacing the error.
- Destination-lookup failures never fail the tool call — they degrade to `null` destinations with
  `destinationEnrichment: 'partial'` or `'unavailable'` (spec FR-006).

## Behavior Notes

- One fresh `McpServer` instance serves each request (factory pattern) — stateless, suitable for
  remote clients such as opencode.
- Host/Origin (DNS-rebinding) validation is armed by `createMcpHonoApp` on the localhost bind.
- No `.http` collection for MCP — validated via the in-process MCP client test and quickstart.