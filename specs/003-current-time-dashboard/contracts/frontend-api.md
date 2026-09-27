# Frontend API Contract: Current Time Dashboard

**Branch**: `003-current-time-dashboard` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

This module is frontend-only, so its "external interfaces" are (a) the public API of the published
components library (`@sousa99/current-time-components`) and (b) the persisted-preference schema
read/written on the user's device. There are no REST/MCP endpoints or backend contracts.

## 1. Published package surface — `@sousa99/current-time-components`

The library entry (`src/index.ts`) MUST export exactly the following, with these signatures.
Anything else is internal and not part of the contract.

### `ClockCard` (component)

The card presentation of the clock: live time readout (hours : minutes : seconds, AM/PM in
12-hour mode), optional format toggle, inside shared card chrome (light amber/slate card style).

Props:

| Prop | Type | Default | Meaning |
|------|------|---------|---------|
| `align` | `'left' \| 'center' \| 'right'` | `'center'` | Alignment of the readout within the widget. |
| `defaultFormat` | `'12h' \| '24h'` | `'24h'` | Format used when nothing is stored, or pinned format when `switchable` is `false`. |
| `switchable` | `boolean` | `true` | When `true`, shows the 12h/24h toggle and persists changes; when `false`, hides it and pins `defaultFormat`. |
| `aspectRatio` | `string` (CSS ratio, e.g. `'16/9'`, `'1/1'`, `'4/3'`) | `undefined` | Optional constraint on the widget's proportions. When set, the widget keeps this ratio while filling the allowed space; when unset, it fills available width/height freely. |

**Sizing behavior (FR-016, FR-017)**: the widget expands to fill the available width and height of
its container, and the clock readout text scales to fit. The scaling mechanism is internal
(container-measured; see [research.md](research.md) R-008) and MAY change without a version bump.

### `ClockPlain` (component)

The plain presentation of the clock: identical behavior and identical props to `ClockCard`,
rendering the same readout with **no card chrome**.

### `ClockFace` (component)

Pure readout — renders `hours`, `minutes`, and `seconds` with clear visual separation, honoring the
active format (AM/PM indicator in 12-hour mode). Props: `time: TimeParts`. Used internally by both
widgets; also exported for consumers building custom layouts.

### `TimeFormatToggle` (component)

Control for switching between 12-hour and 24-hour format. Props: `format: TimeFormat`,
`onChange: (format: TimeFormat) => void`. Used by the widgets when `switchable` is `true`.

### `DashboardPage` (component)

The dashboard-style page composing `ClockCard` (center-aligned, switchable) with the module's
layout and styling. Default route of the SPA.

### `useCurrentTime(): Date`

React hook returning the current device time as a `Date` snapshot. Re-renders at least once per
second while visible; resynchronizes on mount and on visibility/focus regain (self-correcting).

### `formatTimeParts(date: Date, format: TimeFormat): TimeParts`

Pure function deriving the display parts from a single `Date` snapshot. `hours`/`minutes`/`seconds`
are zero-padded two-digit strings; `ampm` is non-null only when `format === '12h'`. Must not read or
write storage (pure).

### `getTimeFormat(fallback?: TimeFormat): TimeFormat`

Returns the stored format, falling back to the supplied `fallback` (default `'24h'`) when the stored
value is absent or invalid. Reads the storage key below.

### `setTimeFormat(format: TimeFormat): void`

Persists the chosen format under the storage key. Accepts only `'12h' | '24h'` (typed).

### Exported types

`TimeFormat = '12h' | '24h'`; `TimeParts` (above). Component prop types `ClockCardProps`,
`ClockPlainProps`, `ClockFaceProps`, and `TimeFormatToggleProps`.

## 2. Persisted preference schema

Stored on the user's device in browser local storage — never transmitted.

- **Storage key**: `current-time:time-format`
- **Stored value**: exactly `"12h"` or `"24h"` (a JSON string, no wrapper object).
- **Absent or invalid value** → treated as the widget's `defaultFormat` (falling back to `'24h'`),
  never an error.
- **Write policy**: only when a widget's `switchable` is `true`. Non-switchable widgets never
  read or write it.
- **Scope**: per browser/device, shared across all embedded widgets (single household preference).

## 3. Non-contract guarantees (internal behavior, not part of the surface)

- The ticking mechanism, the `ClockWidget` internal core, and the Tailwind styling tokens are
  internal and MAY change without a version bump.
- Adding exports to the surface is a minor change; renaming/removing any contract member, or
  changing widget props, is a breaking change requiring a version bump and changeset.

## 4. Validation coverage

Contract behavior is verified by the test suite (see [quickstart.md](quickstart.md) and `tasks.md`):
- `use-current-time.test.ts` — ticking, boundary advance, resync on visibility/focus.
- `use-clock-format.test.ts` — seeding from stored/default, pinning when not switchable, persist
  policy.
- `time-format.test.ts` — `formatTimeParts` output, `getTimeFormat` defaulting, `setTimeFormat`
  round-trip, invalid-value fallback.
- `clock-face.test.tsx` — readout parts and AM/PM rendering.
- `clock-widget.test.tsx` — both widgets render identical readouts (chrome differs), alignment
  honored per `align`, `defaultFormat` seeding, `switchable` true/false behavior + persistence,
  fill/scale + legibility clamp, `aspectRatio`, and the shared preference across widgets.
- `dashboard.test.tsx` — dashboard renders the card widget; toggle flow and persistence.
- `time-format-toggle.test.tsx` — toggle reflects/persists format.

## 5. Component workbench

The module MUST expose a Storybook workbench (scripts `storybook`/`build-storybook`,
`@storybook/addon-docs`) with:
- `Clock.mdx` — written documentation page for `ClockCard` and `ClockPlain` (Meta/Canvas/ArgTypes).
- `ClockCard.stories.tsx` / `ClockPlain.stories.tsx` — previews across align × defaultFormat ×
  switchable (satisfies spec FR-014, SC-009).
- `DashboardPage.stories.tsx` — dashboard preview.