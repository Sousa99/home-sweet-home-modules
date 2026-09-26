# Contract: Frontend Component — ViewModeToggle

**Interface**: React component (frontend package, exported from `components/index.ts`)
**Domain**: `view-mode` | **Stories**: `ViewModeToggle.stories.tsx`

## Purpose

A single-action control that switches the fly-over results display between the **list** mode
and the **map** mode (spec FR-001).

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `mode` | `'list' \| 'map'` | yes | The currently active display mode. |
| `onChange` | `(mode: 'list' \| 'map') => void` | yes | Called with the newly requested mode when the user selects it. |

## Behavior

- Renders two selectable options: `List` and `Map`.
- The active option is visually marked as selected.
- Clicking the active option is a no-op (does not call `onChange`).
- Switching modes does not run or reset a query; the current query and results are preserved
  (spec FR-003). The owner (`App`) keeps the same `FlyOverResult` and re-renders it in the
  selected mode.

## Example (JSX)

```tsx
<ViewModeToggle mode={mode} onChange={setMode} />
```

## Acceptance

- Selecting `Map` from list mode calls `onChange('map')`.
- Selecting `List` from map mode calls `onChange('list')`.
- Re-selecting the current mode does not call `onChange`.
- Renders with the project's existing UI primitives and HSH theme.