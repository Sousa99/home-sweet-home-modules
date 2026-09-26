# Contract: Frontend Component — RefreshRateSelect (new)

**Interface**: React component (frontend package, exported from `components/index.ts`)
**Domain**: `refresh-rate-select` | **Stories**: `RefreshRateSelect.stories.tsx`

## Purpose

A labeled selector for the auto-refresh cadence of the fly-over results: off, 5, 10, 30, or 60
seconds. Replacing `value` sets a new cadence; the owner (`App`) owns the timer logic.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `value` | `RefreshRate` | yes | The currently selected rate (`'off' \| 5 \| 10 \| 30 \| 60`). |
| `onChange` | `(value: RefreshRate) => void` | yes | Called with the newly selected rate. |

`RefreshRate` is exported from the component module and from `components/index.ts`.

## Behavior

- Renders a labeled `<select>` with exactly the options off, 5, 10, 30, and 60 seconds
  (spec FR-007), defaulting to off.
- Selecting an option calls `onChange` with the matching `RefreshRate`; re-selecting the current
  value is a no-op.
- Disabled while a query is in flight is **not** required — the selector remains usable so the
  user can adjust the cadence at any time; the owner applies it to the active timer.
- Does not itself run, cancel, or schedule any query (single responsibility); that is the owner's
  concern.

## Example (JSX)

```tsx
<RefreshRateSelect value={refreshRate} onChange={setRefreshRate} />
```

## Acceptance

- Renders exactly the five options (off, 5, 10, 30, 60) with off selected by default.
- Selecting an option calls `onChange` with the chosen rate.
- Re-selecting the active option does not call `onChange`.