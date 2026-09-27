# Data Model: Current Time Dashboard

**Branch**: `003-current-time-dashboard` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

The module is frontend-only with no server-side data. Two entities: the persisted time-format
preference and the derived time readout (transient). Plus the widget presentation configuration
(per-embedding options, not persisted globally).

## Entity: TimeFormatPreference

The user's chosen 12/24-hour display setting — the only persisted data, living on the user's device
(local-first, private by default).

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| format | `TimeFormat` (`'12h' \| '24h'`) | `'24h'` | Required; exactly one of the two union values. Invalid/unparseable stored values fall back to `'24h'`. |

**Persistence**: browser local storage under key `current-time:time-format` (see
[contracts/frontend-api.md](contracts/frontend-api.md)). One value per browser/device, shared across
all embedded widgets.

**Validation rules (spec FR-007, FR-008, FR-012, FR-013)**:
- Written only when a widget's `switchable` option is enabled; when disabled the format is fixed to
  `defaultFormat` and nothing is stored or read.
- A stored value that is not `'12h'` or `'24h'` is treated as absent (fallback to the widget's
  `defaultFormat`, itself defaulting to `'24h'`).
- Changing format immediately updates the visible readout.

**State transitions**: `24h ⇄ 12h` — a single toggle, no other states, no lifecycle.

## Entity: TimeParts

The derived display value rendered by the readout. Transient — recomputed on every tick; never persisted.

| Field | Type | Description |
|-------|------|-------------|
| date | `Date` | The authoritative snapshot used for this render (single source of truth per tick). |
| hours | `string` | Zero-padded hour per the active format (e.g., `'09'`, `'14'`). |
| minutes | `string` | Zero-padded minutes (e.g., `'05'`). |
| seconds | `string` | Zero-padded seconds (e.g., `'42'`). |
| ampm | `'AM' \| 'PM' \| null` | Non-null only in 12-hour format. |

**Derivation rule**: all parts derive from the single `date` snapshot via
`formatTimeParts(date, format)` so hours/minutes/seconds are mutually consistent at every render.

## Entity: ClockWidgetPresentation

The per-embedding configuration of the published clock widgets. A configuration, not persisted data.

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| presentation | `'card' \| 'plain'` | `'card'` | Fixed per component: `ClockCard` → `card`, `ClockPlain` → `plain`. |
| align | `'left' \| 'center' \| 'right'` | `'center'` | Position of the readout within its container. |
| defaultFormat | `TimeFormat` | `'24h'` | Seeds the display format when nothing is stored (or when `switchable` is `false`). |
| switchable | `boolean` | `true` | When `true`: toggle shown, changes persisted. When `false`: no toggle, format pinned to `defaultFormat`. |
| aspectRatio | `string \| undefined` | `undefined` | Optional CSS ratio (e.g. `'16/9'`, `'1/1'`, `'4/3'`). When set, the widget keeps these proportions; when unset, it fills available width/height freely. |

**Validation rules (spec FR-010…FR-013, FR-016, FR-017, SC-006…SC-008, SC-010)**:
- Both presentations expose identical options and render the identical readout; only chrome differs.
- Invalid `defaultFormat` values fall back to `'24h'`.
- Widgets expand to fill available container space, scaling the readout text to fit; the
  aspect-ratio constraint is optional and must not cause overflow or illegibility.

## Relationships

- `ClockWidgetPresentation` configures how `TimeParts` is rendered (align) and which
  `TimeFormatPreference` behavior applies (defaultFormat/switchable).
- `TimeParts` depends on the device clock (`Date`); no other entity references it.
- `TimeFormatPreference` is read/written only when `switchable` is enabled.

No foreign keys, joins, migrations, or backend schema — the model is intentionally minimal for a
self-contained frontend feature.