# Contract: REST — Get Fly-Overs Over a Location

**Interface**: REST (Hono on Node, port **3000**)
**Domain**: `fly-overs` | **HTTP collection**: `backend/http/fly-overs.http`

## Endpoint

```
GET /api/fly-overs?lat={lat}&lng={lng}&radiusKm={radiusKm}
```

## Query Parameters

Validated with the shared `LocationQuerySchema` (zod v4):

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
  "aircraft": [
    {
      "icao24": "3c6444",
      "callsign": "DLH400",
      "originCountry": "Germany",
      "destinationAirport": null,
      "destinationCountry": null,
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

- `asOf`: Unix seconds the result reflects the feed.
- `count`: length of `aircraft`.
- `aircraft` may be an empty array (no aircraft in range — still 200, spec FR-006).
- `destinationAirport` / `destinationCountry`: estimated destination for the aircraft,
  `null` until a flight/route lookup is wired up (the live feed does not provide it).

### 400 Bad Request — validation error

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

Emitted for any missing, non-numeric, or out-of-range parameter.

### 502 Bad Gateway / 503 Service Unavailable — feed error

```json
{
  "success": false,
  "message": "Aircraft feed is temporarily unavailable"
}
```

- `502`: upstream feed returned an error or malformed payload.
- `503`: upstream feed rate-limited (`429`, honor `X-Rate-Limit-Retry-After-Seconds`) or timed out.
- Never returns stale data labeled as fresh (spec FR-008).

## Behavior Notes

- Backed by the shared `FlyOverService`; identical semantics to the MCP `planes_over` tool.
- Request logged via `pino-http` (method, path, status, duration).
- Feed is queried per request; no caching (MVP scope).