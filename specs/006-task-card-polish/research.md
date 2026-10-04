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

## 2. Gentle transition mechanism

**Decision**: Add a numeric `exitTravel` prop to the low-level `DeckCards`/`DeckCard` (default
`500`, reproducing today's ±500px pan exactly) and a semantic `transitionVariant: 'slide' | 'gentle'`
prop (default `'slide'`) on `TaskDeck`/`TaskDeckWrapper`. `gentle` maps to an `exitTravel` of `80`
(≈15% of the default). The exiting card's travel is the only thing that changes.

**Evidence (current animation)**:
- `ui/deck/deck.tsx:245-251` — `exitX` is hard-coded `-500` / `500` when `exitDirection` is set.
- `ui/deck/deck.tsx:256-270` — exit is animated via `animate={{ x: exitX, opacity: 0 }}`; duration
  comes from `slideDurationMs` (default 500ms). Rotation, scale, stack depth, and drag/opacity
  mapping (threshold 150) are independent of `exitX`.
- `deck.tsx` already exposes `indexChangeDirection` (which way cards exit) but no distance knob.

**Rationale**:
- `exitTravel` on the raw deck is the minimal additive primitive; `transitionVariant` is the
  documented, user-facing switch on the published components (FR-004/FR-005).
- `80`px keeps a perceptible slide so the transition still feels animated ("pans a bit less", per
  the user), while staying well under half of the default's 500px (SC-003).
- Defaults reproduce current behavior bit-for-bit, satisfying SC-004 (no change for existing
  consumers). Swipe dismissal (manual drag past threshold) is untouched — `exitTravel` only shapes
  the automatic/`indexChangeDirection` exit animation.

**Alternatives considered**:
- A `transitionVariant` enum only, no numeric knob — rejected: the raw deck stays flexible, and
  the numeric default makes the "unchanged" guarantee explicit and testable.
- A percentage/easing-based preset ("pan" vs "fade") — rejected: the user asked specifically for
  less sideways travel, not a different easing; keeping easing identical is a constraint.
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
- New tests: deck empty state renders the card (both empty-array and fully-filtered cases), gentle
  variant resolves to the smaller `exitTravel` (asserted via a resolvable mapping or a rendered
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
  the `task-deck-empty` test id and message text; gentle variant via the resolved travel value
  (unit function or prop passthrough check).

---

## Research summary

| Unknown | Decision |
|---------|----------|
| Where empty state lives | One shared `TaskDeckEmpty` used by both `TaskDeck` and `TaskDeckWrapper`; messages preserved; deck stops returning `null` |
| Gentle transition mechanism | `exitTravel` (default 500) on raw `DeckCards`; `transitionVariant: 'slide'\|'gentle'` (default `slide`) on published components; gentle = 80px |
| Compact size + override | Stage height via CSS var `--deck-height` (default `16rem`); override through existing `style`/`className` surface; `style` forwarded additively |
| Backward compatibility | All new props/export additive with current-behavior defaults; existing tests preserved/extended |
| Testing | Vitest + RTL in `tests/`; travel asserted at mapping boundary, size via CSS var, empty via test id + message |