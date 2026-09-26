# Contract: Frontend Component — FlyOverForm (updated)

**Interface**: React component (frontend package, exported from `components/index.ts`)
**Domain**: `fly-over-form` | **Stories**: `FlyOverForm.stories.tsx`

## Purpose

The typed location inputs (latitude, longitude, radius) with inline validation and the
"Find aircraft" submit button. Updated from an uncontrolled form to a **controlled** component so
the map selection can update the inputs (spec FR-006) and input edits can reposition the map
(spec FR-007) through a single shared location draft.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `value` | `LocationQuery` | no | The current shared location draft rendered into the fields. When `null`/`undefined`, the fields start empty. |
| `onChange` | `(value: LocationQuery) => void` | no | Called whenever a field becomes a valid, in-range value (per field edit). Lets the owner move the map selection in sync. |
| `onSubmit` | `(query: LocationQuery) => void` | yes | Called with a validated query when the form is submitted via "Find aircraft". |
| `loading` | `boolean` | no | Disables the inputs and submit button while a query is in flight. Default `false`. |

`LocationQuery` comes from `api/types.ts` (`{ lat, lng, radiusKm }`).

## Behavior

- Renders the three existing labeled inputs and the submit button; existing inline validation
  and error messages are unchanged (spec FR-014).
- **Controlled**: the fields reflect `value`; external changes (from the map) appear in the
  inputs immediately.
- **Local editing**: while the user types, the form keeps local text state so partial input is
  not destroyed by the controlled value; on each field change it parses the fields and, if the
  result is valid and in range, calls `onChange` with the parsed `LocationQuery`.
- **Submit**: pressing "Find aircraft" validates and calls `onSubmit(query)` exactly as before;
  invalid input shows field errors and does not submit.
- **Backward compatibility**: existing consumers that pass only `onSubmit` (and no `value`/
  `onChange`) keep the previous uncontrolled behavior.

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

- Renders the three inputs and the submit button.
- Submits a parsed, validated `LocationQuery` for valid input; blocks on invalid input with
  field errors (unchanged).
- When `value` changes externally (map drag), the inputs update to the new values.
- When the user edits a field to a valid value, `onChange` fires with the updated
  `LocationQuery` so the map can reposition.
- `loading` disables inputs and the button.