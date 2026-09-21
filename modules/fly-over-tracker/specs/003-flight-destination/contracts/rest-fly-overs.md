# Contract: REST — Get Fly-Overs Over a Location (updated)

**Interface**: REST (Hono on Node, port **3000**)
**Domain**: `fly-overs` | **HTTP collection**: `backend/http/fly-overs.http`

## Endpoint

```
GET /api/fly-overs?lat={lat}&lng={lng}&radiusKm={radiusKm}
```

## Query Parameters

Unchanged — validated with the shared `LocationQuerySchema` (zod v4):

| Param | Type | Required | Constraint |
|-------|------|----------|-----------|
| `lat` | number | yes | `-90 ≤ lat ≤ 90` |
| `lng` | number | yes | `-180 ≤ lng ≤ 180` |
| `radiusKm` | number | yes | `0 < radiusKm ≤ maxRadiusKm` (default max 500) |

## Responses

### 200 OK — `FlyOverResult`

```json
{
  "center": { "lat": 48.8566, "lng": 2.3522 },
  "radiusKm": 50,
  "asOf": 1726900000,
  "count": 1,
  "destinationEnrichment": "complete",
  "aircraft": [
    {
      "icao24": "3c6444",
      "callsign": "DLH400",
      "originCountry": "Germany",
      "destinationAirport": "EDDF",
      "destinationCountry": "Germany",
      "latitude": 48.9211,
      "longitude": 2.4288,
      "altitude": 9144.0,
      "onGround": false,
      "velocity": 251.2,
      "trueTrack": 87.5,
      "verticalRate": 0.0,
      "distanceKm": 8.2
    }
  ]
}
```

- `destinationEnrichment`: `'complete'` | `'partial'` | `'unavailable'` (see `data-model.md`).
  `'unavailable'` when no OpenSky credentials are configured (anonymous tier).
- `destinationAirport` / `destinationCountry`: estimated destination, `null` when not identified
  by the data source or when enrichment is `'partial'`/`'unavailable'`.
- All other fields unchanged; `aircraft` may be an empty array (still 200, spec FR-006).

### 400 Bad Request — validation error

Unchanged:

```json
{
  "success": false,
  "message": "Invalid request",
  "errors": [
    { "field": "lat", "message": "lat must be between -90 and 90" },
    { "field": "radiusKm", "message": "radiusKm must be greater than 0" }
  ]
}
```

### 502 Bad Gateway / 503 Service Unavailable — feed error

Unchanged shape; behavior refined:

```json
{
  "success": false,
  "message": "Aircraft feed is temporarily unavailable"
}
```

- `502`: upstream returned an error or malformed payload.
- `503`: upstream rate-limited or timed out. The backend now **retries bounded attempts** on
  `429`, honoring `X-Rate-Limit-Retry-After-Seconds` (or a configured default backoff when the
  header is absent), before returning `503`. `401` triggers one token refresh + retry.
- The aircraft-positions and destination buckets are retried independently (spec FR-010).

## Behavior Notes

- Backed by the shared `FlyOverService`; identical semantics to the MCP `planes_over` tool.
- Request logged via the Hono logging middleware (method, path, status, duration).
- Feed is queried per request; destination lookups are cached in memory (positive TTL 10 min,
  negative TTL 60 s) and fetched with bounded concurrency (default 8).
- Credentials are never logged or echoed in responses.