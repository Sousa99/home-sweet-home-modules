# Bug Fix: Line-filter selection breaks for bidirectional stops

- **Slug**: line-filter-duplicates
- **Fixed**: 2026-09-25
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

A logical line (e.g. "736") is two routes with the same `short_name` (one per
direction). The config UI rendered one toggle per route but keyed selection off
the shared short name, so both direction buttons lit up together and clicking
the second one deselected the line — the intended filter could never be saved,
and failed saves surfaced no error. The fix dedupes line toggles by short name,
dedupes `servingLines` on the backend for consistency, and surfaces inline
mutation errors.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `backend/src/providers/carris-metropolitana/queries.ts` | modified | `servingLines` now groups by `lines.shortName` (was `lines.id`), so `GET /api/stops/:id` returns one entry per line number |
| `frontend/src/components/ConfigPanel.tsx` | modified | Added `uniqueLines()` dedupe (add flow + `EditFilter`); wrapped saves in try/catch; added inline `addStop`/`updateStop` error messages via `mutationError()` |
| `backend/src/providers/carris-metropolitana/queries.test.ts` | added test | Bidirectional stop (two routes, same short name) → `getStop` returns one "736" entry |
| `frontend/src/components/ConfigPanel.test.tsx` | added tests | One button per short name, stays selected, saves once; duplicate-stop save shows inline error |

## Diff Highlights

`queries.ts` — one entry per line number:

```ts
// A logical line (e.g. "736") is two routes with the same short_name
// (one per direction); filter by line number, so expose one entry each.
.groupBy(schema.lines.shortName)
```

`ConfigPanel.tsx` — one toggle per line number:

```tsx
function uniqueLines(lines: Line[]): Line[] {
  const seen = new Set<string>();
  return lines.filter((line) => {
    if (seen.has(line.shortName)) return false;
    seen.add(line.shortName);
    return true;
  });
}
```

`ConfigPanel.tsx` — errors are now visible:

```tsx
{addStop.isError && (
  <p className="mt-2 text-sm text-red-600" role="alert">
    {mutationError(addStop.error)}
  </p>
)}
```

## Tests Added or Updated

- `backend/src/providers/carris-metropolitana/queries.test.ts::dedupes serving lines by short name (bidirectional stops)` — pins the `servingLines` dedupe for a stop served by two routes with the same short name.
- `frontend/src/components/ConfigPanel.test.tsx::dedupes lines sharing a short name (bidirectional stops)` — one "736" button renders, stays selected after clicking, and saving sends `lineFilter: ["736"]` once.
- `frontend/src/components/ConfigPanel.test.tsx::shows an inline error when saving a duplicate stop fails` — a `duplicate_stop` failure renders "This stop is already configured." instead of failing silently.

## Local Verification

- `pnpm --filter ./backend exec vitest run src/providers/carris-metropolitana/queries.test.ts` → 15 passed
- `pnpm --filter ./frontend exec vitest run src/components/ConfigPanel.test.tsx` → 10 passed
- `pnpm test` → backend 122 passed, frontend 31 passed
- `pnpm lint`, `pnpm format`, `pnpm typecheck`, `node scripts/scaffold.mjs --check` → all pass

## Deviations from Assessment

- The assessment suggested possibly deduping `servingLines`; that was applied. The `mutationError` helper uses duck-typing on the error's `code` field rather than `instanceof ApiError`, because the test suite fully mocks `../api/client` and the class is not available under the mock. Behavior is identical for real `ApiError` instances.

## Follow-ups

- Manual E2E check in the running SPA: add a bidirectional stop, pick two distinct lines (e.g. "736" and "706"), save, and confirm the filter persists; confirm a duplicate add now shows the inline error.
- Consider adding direction-aware display later if per-direction filtering ever becomes a requirement (documented in the assessment as out of scope).

## Follow-up (2026-09-25) — direction-aware selection supersedes the dedupe

User feedback: the short-name dedupe hid the two directions, but the desired
behavior is to **select a specific direction** for a station. The dedupe was
reverted and replaced with direction-aware selection, which also turned out to
be the fix for live ETAs never appearing:

- **Root cause of "no ETAs"**: the CM realtime feed's `trip_id`
  (e.g. `[PCN1R][BNA17]2805_0_1|150|1|1830`) does **not** match our static
  GTFS `trips.id`, so the exact-trip merge never fired. The merge now matches
  by **line + direction + scheduled-time proximity** (the feed exposes its own
  scheduled time), tolerant to ±3 min of feed-version drift.
- **Direction-aware filtering**: `servingLines` exposes one option per
  (shortName, direction); the config UI shows `"736 → Cais"` / `"736 →
  Outurela"`; the filter stores `shortName:directionId` tokens (plain
  `shortName` still means "any direction" for backward compat). `nextTimes`
  filters per direction; `validateLineFilter` accepts and validates the
  tokens.
- The inline-error surfacing from the original fix was retained.

Relevant code: `backend/src/providers/carris-metropolitana/queries.ts`,
`backend/src/providers/carris-metropolitana/realtime.ts`,
`backend/src/services/schedule.ts`, `backend/src/services/config.ts`,
`frontend/src/components/ConfigPanel.tsx`.