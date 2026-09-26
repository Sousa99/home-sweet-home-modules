# Research — Per-Stop Departure Alert Thresholds (004)

**Date**: 2026-09-25

Consolidated decisions for the design artifacts. Format: Decision / Rationale /
Alternatives considered.

## 1. How thresholds are stored and surfaced

- **Decision**: `configured_stops` gains three nullable integer columns
  (`heads_up_min`, `leave_now_min`, `missed_min`). `NULL` means "not
  configured". The API resolves `NULL` to the documented defaults (10 / 5 / 1)
  when serializing a `ConfigStop`, so clients always receive concrete numbers.
- **Rationale**: Keeps the persistence schema honest (we can still tell
  "default" from "custom") while giving the SPA a single, simple contract —
  it never branches on null. Editing shows current (possibly default) values
  and overwrites them, which is the simplest UX.
- **Alternatives considered**:
  - Always persist explicit values on add (write defaults at insert time):
    simpler reads but loses the "unset" distinction and clutters the write path.
  - Expose nullable fields to the client and resolve defaults in the frontend:
    moves domain rules into the view and risks two sources of truth for the
    default constants.

## 2. Default threshold values

- **Decision**: Defaults are heads-up = 10, leave now = 5, missed = 1 minutes.
- **Rationale**: The spec Assumptions propose these values; they form a
  sensible walking-time budget hierarchy for a city bus stop and were not
  contested during clarification. Defined as a single shared constant on the
  backend (single source of truth for the API response).
- **Alternatives considered**: Configuring defaults in `backend/src/config.ts`
  env vars (over-engineering for a single-user module).

## 3. Boundary semantics of the urgency levels

- **Decision**: Level is derived by testing `minutesUntil` **at-or-below**
  (`<=`) each threshold, from strictest to most relaxed:
  `minutesUntil <= missed` → `missed`; `<= leaveNow` → `leave-now`;
  `<= headsUp` → `heads-up`; otherwise `relaxed`. A bus exactly at a threshold
  minutes value gets the stricter level.
- **Rationale**: Matches FR-007 ("at or below the missed threshold") and makes
  SC-004 deterministic — a bus with `minutesUntil == 5` and leave-now = 5 is
  `leave-now`, consistently across refreshes. Missed-first ordering guarantees
  a zero-minute bus is never relaxed (edge case).
- **Alternatives considered**: `<` semantics (crossing strictly after the
  threshold) leaves an ambiguous gap at exact equality and contradicts FR-007.
  Relaxed-first with `>` inverse rules is equivalent but harder to read.

## 4. Threshold validation (create and partial update)

- **Decision**: Validate at the service layer after zod shape checks:
  values must be non-negative integers and `headsUp >= leaveNow >= missed`.
  On **update**, unspecified fields fall back to the currently stored values
  before the ordering check, so a partial update cannot produce an invalid
  combination. Violations return `400 { error: "invalid_body", detail: ... }`.
- **Rationale**: Ordering spans three fields and (for partial updates) the
  persisted row, which zod's per-field checks cannot express alone. Existing
  error envelope and status codes are reused, so no HTTP route changes.
- **Alternatives considered**: A zod `superRefine` doing a DB read for stored
  values (mixes persistence into the schema layer); pushing ordering rules to
  the frontend only (server must remain authoritative).

## 5. Dot color palette (Tailwind, no text label)

- **Decision**: A small solid dot, `h-2 w-2 rounded-full`, using Tailwind
  scale-500 hues: `bg-green-500` (relaxed), `bg-amber-500` (heads-up),
  `bg-orange-500` (leave now), `bg-slate-900` (missed). Rendered at the start
  of each bus row, left of the line badge.
- **Rationale**: Scale-500 solids are vivid on the white card and mutually
  distinct. Amber (not pure yellow) keeps contrast on white; dark slate
  (not literal black) reads as "departed" without looking like a system error.
  The existing Live/Schedule pills are light-tint backgrounds (`*-100`), so a
  solid small dot is visually distinct and cannot be confused with them.
- **Alternatives considered**: `*-400` hues (too pale next to pills);
  pure `bg-black` (harsh); dot + row tint (violates "minimal" choice);
  text labels (rejected by the user — dot only).

## 6. Migration approach

- **Decision**: Add the three nullable columns via a Drizzle migration
  generated with `pnpm db:generate` (drizzle-kit) and applied with
  `pnpm db:migrate`. Nullable + default-on-read means existing rows need no
  backfill.
- **Rationale**: Matches the existing migration workflow (folder
  `backend/drizzle`, migrator in `backend/src/db/migrate.ts`). No data
  transformation required.
- **Alternatives considered**: Hand-written SQL migration (diverges from the
  project's drizzle-kit convention).

## 7. Storybook / published component contract

- **Decision**: `StopCard` gains an optional `thresholds` prop
  (`{ headsUpMinutes, leaveNowMinutes, missedMinutes }`), defaulting to
  10 / 5 / 1. The urgency module lives in `frontend/src/lib/urgency.ts` and is
  exercised by both the SPA and the published component. Stories and MDX
  document the prop with example states for each level.
- **Rationale**: `StopCard` is the published widget (spec 003); keeping the
  derivation in a shared pure module means the SPA and library can never
  diverge (constitution principle of shared single implementation).
- **Alternatives considered**: Computing levels in the backend and shipping
  them in the times payload (adds contract surface; the client already has
  `minutesUntil`; thresholds are presentation policy).