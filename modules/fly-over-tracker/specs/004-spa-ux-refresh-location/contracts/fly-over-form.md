# Contract: Frontend Component — FlyOverForm (updated)

**Interface**: React component (frontend package, exported from `components/index.ts`)
**Domain**: `fly-over-form` | **Stories**: `FlyOverForm.stories.tsx`

## Purpose

The typed location inputs (latitude, longitude, radius) with inline validation and the
"Find aircraft" submit button. This feature adds a **"Use my current location"** control above
the coordinate inputs that fills latitude/longitude from the browser geolocation API, preserving
the radius, without auto-submitting. The public props are unchanged; the control is internal to
the component.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `value` | `LocationQuery` | no | The current shared location draft rendered into the fields. When `null`/`undefined`, the fields start empty. |
| `onChange` | `(value: LocationQuery) => void` | no | Called whenever a field becomes a valid, in-range value (per field edit), and when the current-location control fills the fields. Lets the owner keep the map selection in sync. |
| `onSubmit` | `(query: LocationQuery) => void` | yes | Called with a validated query when the form is submitted via "Find aircraft". |
| `loading` | `boolean` | no | Disables the inputs, the submit button, and the current-location control while a query is in flight. Default `false`. |

`LocationQuery` comes from `api/types.ts` (`{ lat, lng, radiusKm }`).

## Behavior

- Renders the three existing labeled inputs, the submit button, and — **new** — a
  "Use my current location" control above the coordinate inputs (spec FR-002).
- Existing inline validation and error messages are unchanged (spec FR-013).
- **Current-location fill** (spec FR-003): on activation, the control requests the device
  position via the browser geolocation API. On success it fills the latitude and longitude fields
  with the reported position, **preserves the radius** (current valid field value → current shared
  draft radius → default 10 km), and calls `onChange` with the resulting `LocationQuery` so the
  map selection stays consistent (spec FR-006).
- **No auto-submit** (spec FR-004): filling the fields never triggers a query; submission remains
  the explicit "Find aircraft" action.
- **Failure handling** (spec FR-005): on `PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, or `TIMEOUT`
  the control shows a clear inline `role="alert"` message and does **not** change the input
  values. When `navigator.geolocation` is unavailable (insecure context / unsupported browser),
  the control shows an availability message instead of launching a lookup.
- While a lookup is in progress the control is disabled; the user can retry afterward.
- **Backward compatibility**: existing consumers that pass only `onSubmit` keep the previous
  uncontrolled behavior; the current-location control is available in both modes.

## Example (JSX)

```tsx
<FlyOverForm
  value={draft}
  onChange={(next) => setDraft(next)}
  onSubmit={handleSubmit}
  loading={status === 'loading'}
/>
```

## Acceptance

- Renders the three inputs, the submit button, and the current-location control above the inputs.
- Activating the control with a granted position fills lat/lng within 1 second and keeps the
  radius; `onChange` fires with the updated `LocationQuery`.
- Activating the control with denied permission / timeout / unavailable position shows an inline
  alert and leaves the inputs unchanged.
- When geolocation is unsupported, the control shows an availability message and no lookup runs.
- The control never submits a query on its own.
- `loading` disables the inputs, the button, and the control.