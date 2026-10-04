# Research: Task Card Polish

**Feature**: `006-task-card-polish` | **Date**: 2026-10-04

Resolves every open technical unknown from the plan's Technical Context, based on direct
inspection of the procrastinator-tracker frontend source.

---

## 1. Where the empty state lives today

**Decision**: One shared, card-styled empty component (`TaskDeckEmpty`) is created and used by
**both** published levels. `TaskDeck` stops rendering `null` for an empty visible set and renders
the empty card instead; `TaskDeckWrapper` replaces its bare `<p>` empty message with the same
component.

**Evidence (current behavior)**:
- `TaskDeck.tsx:119` — `if (visible.length === 0) return null;` → a blank area at the deck level.
- `TaskDeckWrapper.tsx:114-118` — empty case renders a plain `<p className="rounded-xl bg-white/60 py-8 …">` with `No tasks yet.` or `No tasks match these filters.`
- `ui/deck/deck.tsx:287` — a `DeckEmpty` primitive exists but is **unused** and **not exported** from `src/index.ts`; it is raw-deck markup, not task-domain UI.

**Rationale**:
- FR-001/FR-002 require a *visible empty card*, and FR-008 requires it at both published levels. A
  single component guarantees identical messaging/look by construction (same reasoning as the
  shared status bar precedent in `005`).
- `TaskDeckEmpty` lives under `components/task/` (task-domain UI) and is exported additively, so
  consumers can restyle it or swap the message (Assumptions: wording flexible).
- The existing wrapper test asserts `findByText(/No tasks yet/i)` — the message text must survive,
  so `TaskDeckEmpty` keeps `No tasks yet.` / `No tasks match these filters.` wording and gets a
  `data-testid="task-deck-empty"` for the deck-level test.

**Alternatives considered**:
- Reuse `DeckEmpty` — rejected: it renders `absolute inset-0` overlay markup tuned for the raw deck
  and is not exported; adapting it to both levels is no simpler than a dedicated component.
- Leave the wrapper's `<p>` and only fix the deck — rejected: inconsistent look across the two
  published surfaces and violates FR-008's "same widget, same look" intent.
- Custom `renderEmpty`/`emptyMessage` props — rejected as scope creep; spec allows a single generic
  message. Additive customization is possible later via the exported `TaskDeckEmpty`.

---

## 2. Transition mechanism (revised: slide-up)

**Decision**: The low-level `DeckCards`/`DeckCard` accept an `exitPreset: { x: number; y: number }`
prop (default `{ x: 500, y: 0 }`, reproducing today's ±500px pan exactly) and the published
`TaskDeck`/`TaskDeckWrapper` expose `transitionVariant: 'slide' | 'slide-up'` (default `'slide'`).
`slide-up` maps to `{ x: 0, y: -48 }` — the exiting card rises 48px vertically and fades with **no
sideways travel**.

**Why revised**: the original `gentle` variant (80px horizontal travel) was rejected in review as an
"uncanny middle" — too little travel to read as a slide, too much to read as a fade. In a dense,
side-by-side dashboard any sideways motion reads as a twitch. A vertical exit uses the stack's own
geometry (the next card is fanned below at `yOffset`), so the handoff reads naturally while nothing
moves horizontally.

**Evidence (current animation)**:
- `ui/deck/deck.tsx` — the top card exits via `animate={{ x: exitX, opacity: 0 }}`; `exitX` was
  hard-coded to `±500`. `slideDurationMs` (default 500ms), rotation, scale, stack depth, and the
  drag/opacity mapping (threshold 150) are independent of the exit travel.
- `deck.tsx` already exposes `indexChangeDirection` (which way cards exit) but no exit vector.

**Rationale**:
- `exitPreset` on the raw deck is the minimal additive primitive; `transitionVariant` is the
  documented, user-facing switch on the published components (FR-004/FR-005).
- `y: -48` keeps a perceptible, directional reveal while eliminating sideways motion (SC-003:
  horizontal travel is zero, far under half the default).
- Defaults reproduce current behavior bit-for-bit, satisfying SC-004 (no change for existing
  consumers). Swipe dismissal (manual drag past threshold) is untouched.

**Alternatives considered**:
- A numeric `exitTravel` (the original `gentle`, 80px) — rejected as described above.
- A pure fade (scale 0.9 + opacity, no travel) — rejected as calmer but losing the directional deck
  handoff; `slide-up` keeps a clear "next card comes up" cue.
- Changing the default travel itself — rejected: SC-004 requires existing consumers to see no change.

---

## 3. Compact default size + override mechanism

**Decision**: Replace the stage's hard-coded Tailwind heights (`h-[24rem] w-full sm:h-[26rem]`)
with a compact default applied through a **CSS custom property**: the stage sets
`--deck-height: 16rem` inline and the card stack fills `height: var(--deck-height)`. Consumers grow
the card with the existing style surface (`style={{ '--deck-height': '24rem' }}` or a Tailwind
arbitrary-property class `[--deck-height:24rem]`). No new sizing prop.

**Evidence (current sizing & style plumbing)**:
- `TaskDeck.tsx:122` — `Deck className={cn('h-[24rem] w-full sm:h-[26rem]', className)}`.
- `lib/utils.ts:1-3` — `cn` is a plain `join(' ')`, **not** `tailwind-merge`: a consumer-supplied
  `h-*` class would coexist with the default `h-[24rem]` and the winner would depend on CSS order.
- `ui/deck/deck.tsx:17-19` — `Deck` spreads `...props`, so `style` (an `HTMLAttributes` field)
  already flows to the stage element today.

**Rationale**:
- The plain-`cn` join makes conflicting height *classes* unreliable, but inline `style` always wins
  over classes, and a CSS custom property is a single source of truth — the reliable, idiomatic
  override path given no `tailwind-merge`.
- `16rem` (≈33% shorter than 24–26rem) matches SC-002 "noticeably smaller … while remaining legible
  for typical short task descriptions"; the long-description fixture (7) is already truncated by
  `line-clamp-6` (`TaskDeck.tsx:64`), so compaction does not clip content beyond today's behavior.
- `TaskDeck`/`TaskDeckWrapper` forward `style` through (additive passthrough) so the override works
  at both published levels. The responsive `sm:` bump is deliberately dropped in favor of one
  compact default — the whole point is smaller; consumers can still enlarge on any breakpoint.

**Alternatives considered**:
- Switch `cn` to `tailwind-merge` and rely on `className` — rejected: module-wide behavior change
  and a new dependency for a localized fix; CSS specificity risk for other components.
- A new `size`/`height` prop — rejected explicitly by spec Assumptions (no new sizing API).
- Keep fixed-height classes and document "className override" — rejected: unreliable with plain
  `cn` join; a consumer could pass `h-96` and get no effect.

---

## 4. Backward-compatibility & regression surface

**Decision**: Defaults preserve today's observable behavior; the existing suites are extended, and
the two existing wrapper empty-state assertions are kept (message text unchanged).

**Evidence (tests today)**:
- `tests/task-deck.test.tsx` — 7 tests for rendering, stacking, filters, ordering, auto-rotate,
  custom `renderCard`; none assert the empty case (it currently returns `null`).
- `tests/task-deck-wrapper.test.tsx:49-53` — asserts `findByText(/No tasks yet/i)`; the wrapper's
  empty `<p>` is the only empty-state assertion.
- `src/index.ts` — exports `TaskDeck`, `TaskDeckCard`, `TaskDeckWrapper` + types; adding
  `TaskDeckEmpty` is additive (SC-004: no removal/rename).

**Rationale**:
- New tests: deck empty state renders the card (both empty-array and fully-filtered cases), slide-up
  variant resolves to the vertical exit preset `{ x: 0, y: -48 }` (asserted via a resolvable mapping or a rendered
  prop), compact stage carries `--deck-height: 16rem`, and an override style/class is honored.
- The `DeckEmpty` primitive stays unused in the codebase (pre-existing dead code, out of scope;
  a later nitpicker pass may remove it).

---

## 5. Testing approach

**Decision**: Component tests in `tests/` (Vitest + RTL + jsdom), matching the module's existing
setup. Animation travel is asserted at the mapping boundary (variant → pixel distance) rather than
by measuring motion — jsdom cannot measure layout, and motion's `animate` target is internal.

**Rationale**:
- The existing suites (`task-deck.test.tsx`, `task-deck-wrapper.test.tsx`) already render the deck
  and wrapper with `autoRotateMs={0}` and fake timers; new tests reuse the same patterns.
- `--deck-height` is asserted via `getComputedStyle`/`style` on the stage element; empty state via
  the `task-deck-empty` test id and message text; slide-up variant via the resolved exit preset value
  (unit function or prop passthrough check).

---

## Research summary

| Unknown | Decision |
|---------|----------|
| Where empty state lives | One shared `TaskDeckEmpty` used by both `TaskDeck` and `TaskDeckWrapper`; messages preserved; deck stops returning `null` |
| Transition mechanism | `exitPreset` (default `{x:500,y:0}`) on raw `DeckCards`; `transitionVariant: 'slide'\|'slide-up'` (default `slide`) on published components; slide-up = vertical 48px exit with no sideways travel |
| Compact size + override | Stage height via CSS var `--deck-height` (default `16rem`); override through existing `style`/`className` surface; `style` forwarded additively |
| Backward compatibility | All new props/export additive with current-behavior defaults; existing tests preserved/extended |
| Testing | Vitest + RTL in `tests/`; travel asserted at mapping boundary, size via CSS var, empty via test id + message |