# Contract: Published StopCard Layout

**Feature**: `008-status-bar-placement` | **Date**: 2026-10-04

The only external interface affected by this feature is the **rendered DOM layout** of the published
bus-catcher `StopCard` widget. It is a **UI contract**: the public props/export surface is unchanged,
and the change is limited to where the status bar is mounted relative to the card.

> The status bar itself is the shared `WidgetStatusBar` from `@sousa99/homesweethome-components`;
> its own props and render contract are defined in `specs/005-standardized-component-status/contracts/status-bar.md`
> and are **not** modified by this feature (FR-005).

## Public surface (unchanged)

`src/index.ts` still exports `StopCard`, `StopCardProps`, and `FetchStopTimes`. No export is added,
removed, or renamed (spec Assumptions).

`StopCardProps` is **unchanged** — all existing props (`stopId`, `stopName`, `lines`, `limit`,
`refetchIntervalMs`, `fetchTimes`, `baseUrl`, `missing`, `thresholds`) keep their current signatures,
defaults, and meanings.

## Render contract (changed)

The widget renders a single root container holding the status bar **above and outside** the card:

```text
<div data-testid="stop-card-widget" class="…space-y-2…">   ← WidgetLayout (root)
  <WidgetStatusBar lastUpdatedAt={…} updating={…} error={…} onRefresh={…} />   ← children[0]
  <Card>                                                        ← children[1]
    <CardHeader> <CardTitle>{stopName}</CardTitle> [<Badge>…</Badge>] </CardHeader>
    <CardContent> …waiting times / coverage / loading / missing notice… </CardContent>
  </Card>
</div>
```

Guarantees:

- **Bar above card (FR-001)**: `WidgetStatusBar` is the first child of the root; the `Card` is the
  second child. The bar is fully outside the card element's boundary.
- **Card interior is status-free (FR-002)**: the `Card` contains only the widget's content — stop
  name, line badge, waiting times, coverage notice, loading/empty/missing/error text. It never
  contains the status bar or any of its text (`Last updated`, `Not updated yet`, `Updating…`,
  `Refresh`) or the failure `role="alert"`.
- **Visual separation (FR-003)**: the root applies `space-y-2`; the card's border/background never
  touches the bar.
- **Per-card attribution (FR-004, FR-006)**: each widget renders its own root; the bar spans the
  same width as its card and sits directly above it. In multi-card layouts each bar reflects only its
  own card's load state.
- **Behavior unchanged (FR-005)**: the bar receives the exact same props as today
  (`lastUpdatedAt`, `updating`, `error`, `onRefresh`), with `onRefresh` undefined when `missing`.
  Wording, controls, live regions, and the `role="alert"` failure notice are unchanged (inherited
  from 005). The `refetchIntervalMs` polling and manual Refresh behave exactly as before.
- **All widget states produce the same structure**: loading, ready, error, and missing all render
  the root with bar-first, card-second ordering.

## Accessibility contract

Nothing in this feature removes or alters the bar's accessibility behavior (inherited from 005):
the timestamp and updating indicator stay in polite live regions, the failure notice stays
`role="alert"`, and the Refresh control stays a real `<button>` with an accessible name. The card
and its content are unchanged.

## Validation

- `src/components/StopCard.test.tsx`:
  - **New**: the status bar is a descendant of the root's first child, the card is a descendant of
    the root's second child, and `card.contains(statusText) === false` (FR-001, FR-002).
  - **New**: the card interior's text contains no `Last updated` / `Not updated yet` / `Refresh` /
    `Updating…` text (FR-002).
  - **New**: two rendered widgets each expose their own bar above their own card, and one updating
    does not affect the other (FR-004, FR-006).
  - **Existing**: the full status-bar behavior suite (last-updated time, `Not updated yet`, Refresh
    advances the time, updating indicator, failure notice preserves the timestamp, recovery via
    Refresh, missing state) passes unchanged (FR-005).
- Storybook (`StopCard.stories.tsx`): a multi-widget story demonstrates bar-above-card attribution
  (see `quickstart.md`).