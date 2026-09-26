# Bug Assessment: Line-filter selection breaks for bidirectional stops

- **Slug**: line-filter-duplicates
- **Created**: 2026-09-25
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

> "i found two bugs: if I select two buses for a given stop it does not work,
> i cant push the configuration you know. additionally, some stops have the
> same bus twice (assume going in different directions). this does not work
> when selected because it selects both and emsses something up."

Two related symptoms: (1) selecting two lines for a stop and saving
("pushing the configuration") fails or saves the wrong filter; (2) some stops
list the same line twice (different directions), and selecting it "selects
both" and misbehaves.

## Symptom

In the Config panel, a stop served by the same line in both directions shows
that line number twice. Clicking one direction's button also highlights the
other (they share a toggle state), and clicking the second identical button
deselects the line — so the intended filter cannot be kept selected, and the
saved configuration ends up empty or missing the line. Failed saves surface no
error, so the user sees "I can't push the configuration."

## Reproduction

1. Configure any stop that is served by a line in both directions (e.g. a
   stop on a two-way street with line "736" in both directions). In the CM
   feed such a logical line is two `routes` rows with the same
   `route_short_name` (e.g. route_ids `736_0` and `736_1`).
2. In `ConfigPanel`, select the stop → the "Filter by line" row renders two
   buttons both labeled "736".
3. Click the first "736" → it highlights. Click the second "736" → the line
   is toggled **off** (both unhighlight).
4. Save → `lineFilter` is empty (or, combined with another line, missing the
   intended line).

[NEEDS CLARIFICATION: exact save-blocking failure the reporter hit — two
plausible paths: (a) the duplicated-line toggle collapses the selection so the
intended filter isn't saved; (b) a silent `409 duplicate_stop` when the same
stop is added twice, since `ConfigPanel` shows no mutation error. Both are
addressed by the remediation below.]

## Suspected Code Paths

- `backend/src/providers/carris-metropolitana/queries.ts:94` —
  `servingLines` groups by `lines.id` (route id), so a bidirectional stop
  returns two rows with an identical `shortName`.
- `frontend/src/components/ConfigPanel.tsx:60` — filter buttons keyed by
  `line.id` (both render) but selected/toggled by `line.shortName` (shared):
  `variant={lineFilter.includes(line.shortName)}` and
  `onClick={() => toggleLine(line.shortName)}`.
- `frontend/src/components/ConfigPanel.tsx:220` — `EditFilter` has the same
  shortName-based toggle.
- `frontend/src/components/ConfigPanel.tsx:38` — `save()` surfaces no error;
  `addStop.isError` / the 409 `duplicate_stop` response are never shown.
- `backend/src/services/config.ts:69` — `validateLineFilter` checks
  `lines.shortName`; this path is fine for distinct valid lines and is not the
  blocker.

## Root Cause Hypothesis

Line identity is conflated between `route_id` (unique per direction) and
`short_name` (shared across directions). `servingLines` surfaces one button
per route while the UI keys selection off the shared shortName: both direction
buttons light up together, and clicking the second one runs `toggleLine`, which
removes the line instead of confirming it. The intended line selection can
therefore never be persisted, and the save silently produces a wrong/empty
filter. Confidence: **high** (directly explained by the code; no existing test
covers two routes sharing a shortName).

## Proposed Remediation

**Preferred**: dedupe line buttons by `shortName` so one button is rendered
per line number, and surface mutation errors so failed saves are visible.

- In `ConfigPanel` (`add` flow) and `EditFilter`, dedupe `servingLines` by
  `shortName` before rendering (one toggle per line number). This fixes both
  the double-render and the toggle-off behavior while keeping the existing
  shortName-based filter design (which the dashboard's `nextTimes` already
  uses).
- Add an inline error message on `addStop`/`updateStop` failure (e.g. show
  `addStop.isError` with the API error, including the 409
  "This stop is already configured").

**Alternative** (larger): filter by line/route id so directions become
separately selectable. This changes stored-filter semantics, backend
validation, and the `nextTimes` shortName filtering, and would break existing
saved configs — not worth it for a "show me line 736" mental model.

**Files likely to change**:
- `frontend/src/components/ConfigPanel.tsx`
- `backend/src/providers/carris-metropolitana/queries.ts` (optionally dedupe
  `servingLines` to distinct `shortName`s so `GET /api/stops/:id` is
  consistent)
- Tests: `frontend/src/components/ConfigPanel.test.tsx`,
  `backend/src/providers/carris-metropolitana/queries.test.ts`

**Tests to add or update**:
- A stop served by two routes with the same `shortName` renders **one**
  filter button; clicking it keeps it selected; saving sends
  `lineFilter: ["736"]` once.
- `ConfigPanel` shows an inline error when `addConfigStop` rejects (409/400)
  instead of silently doing nothing.
- `servingLines` returns distinct `shortName`s for a bidirectional stop.

## Risks & Considerations

- Deduping `servingLines` changes the `GET /api/stops/:id` response (fewer
  `lines` entries); verify no other consumer needs per-direction rows
  (StopSearch uses names; Dashboard uses shortName) — low risk.
- Keep filtering semantics as shortName (not route id) to avoid breaking
  existing saved configs and the dashboard query.
- Re-run all quality gates after the fix (`pnpm lint`, `pnpm format`,
  `pnpm test`, `pnpm typecheck`, `node scripts/scaffold.mjs --check`).

## Open Questions

- [NEEDS CLARIFICATION: reproduce the exact save-blocking failure in a
  running SPA to confirm whether it is solely the duplicate-shortName toggle
  collapse or also the silent 409 duplicate_stop path — the remediation
  addresses both.]
- [NEEDS CLARIFICATION: confirm direction-specific filtering is NOT a
  requirement (i.e., filtering by line number is intended behavior).]