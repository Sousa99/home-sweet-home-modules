# Feature Specification: Task Card Polish

**Feature Branch**: `006-task-card-polish`

**Created**: 2026-10-04

**Status**: Draft

**Input**: User description: "i want to improve the task-procrastinator published task cards. the animation is nice but it does not look that well within a dashboard where a bunch of widgets are side by side. i need two changes. when no tasks exist i want to show an empty card or soemthing isntead of simply blank. i want to keep the current animation but have an alternative which maybe pans a bit less to the side when transitioning or something. and i want the aspect ratio to be smaller, most tasks have rather small descriptions, there is no use in having such a big card every time i guess. maybe by default smaller but styles can make it bigger?"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visible Empty State (Priority: P1)

As someone using the published task deck widget in a dashboard, when there are no tasks to show — either because the household has no tasks yet or because the active filters exclude everything — I see a clear, friendly empty card (with a message) instead of a blank, empty area, so I understand the widget is working but has nothing to display.

**Why this priority**: The blank space is the most confusing symptom in a dashboard full of side-by-side widgets; it reads as a broken widget. A visible empty state is the smallest fix that removes that confusion.

**Independent Test**: Load the published task deck widget with a dataset containing no tasks, then with a dataset whose tasks are all excluded by the active filters; confirm a visible empty card with a message renders in both cases instead of nothing.

**Acceptance Scenarios**:

1. **Given** the published task deck widget and no tasks in the dataset, **When** the widget renders, **Then** a visible empty card with a friendly message appears in place of a blank area.
2. **Given** the published task deck widget and a dataset where every task is excluded by the active filters, **When** the widget renders, **Then** the same visible empty card appears.
3. **Given** the empty state is showing, **When** tasks become available (added or filters relaxed), **Then** the widget transitions back to showing the task cards normally.
4. **Given** the published task deck widget with at least one matching task, **When** the widget renders, **Then** no empty card is shown.

---

### User Story 2 - Gentler Transition Animation (Priority: P2)

As someone using the published task deck widget in a dashboard, I can choose between the current wide panning transition and a calmer alternative that slides cards mostly vertically with far less sideways travel, so the widget feels less "flighty" next to other widgets and still keeps the nice card-stack feel.

**Why this priority**: The user explicitly wants to keep the current animation while gaining an alternative. This is additive and low-risk, but only matters once the widget is visibly rendering properly (P1).

**Independent Test**: Render the widget with the current transition (default, unchanged) and again with the gentler transition selected; observe the gentler mode's card travel is noticeably smaller horizontally while the stack, rotation, and swipe behaviors are preserved.

**Acceptance Scenarios**:

1. **Given** the published task deck widget using its default settings, **When** a card transitions to the next, **Then** the behavior is unchanged from today's wide pan.
2. **Given** the widget configured to use the gentler transition, **When** a card transitions to the next, **Then** the exiting card travels significantly less to the side than in the default mode while the remaining stack still advances smoothly.
3. **Given** the widget configured to use the gentler transition, **When** I manually swipe a card, **Then** the swipe still responds in the normal way (cards can still be dismissed left/right).
4. **Given** a consumer that does not opt into the gentler transition, **When** they render the widget, **Then** they see today's animation and nothing about their setup needs to change.

---

### User Story 3 - Compact Default Size (Priority: P2)

As someone placing the published task deck widget side by side with other widgets in a dashboard, I see a more compact card by default — sized for typical short task descriptions — and I can make it bigger with a style when I want to, so the widget takes up a sensible amount of vertical space instead of dominating the row.

**Why this priority**: The oversized card is the second concrete complaint in a side-by-side dashboard. A smaller default with an override keeps everyone happy; it is still additive and can land independently.

**Independent Test**: Render the widget with no size overrides and measure its vertical extent; confirm it is smaller than today's default. Then apply a size override and confirm the widget grows to the requested size.

**Acceptance Scenarios**:

1. **Given** the published task deck widget with default settings, **When** it renders, **Then** its default height is smaller than today's default (a compact card suited to short descriptions).
2. **Given** the widget with default settings, **When** a task has a long description, **Then** the card still clips/truncates the description gracefully without growing to full height.
3. **Given** a consumer that passes a size override (via the existing style/class surface), **When** the widget renders, **Then** the card uses the larger requested size.
4. **Given** the widget inside a container with a constrained height, **When** it renders, **Then** it fills its container appropriately rather than forcing a fixed large size.

---

### Edge Cases

- What happens when there is a single task in the deck and it transitions? The deck must not break or leave a blank card behind.
- What happens when the empty state is showing while a refresh is in progress? The empty card must not flash or conflict with loading feedback.
- What happens when the active filters exclude every task but more tasks exist in the dataset? The same empty state as "no tasks at all" must appear (consistent messaging).
- What happens when a consumer passes both a custom `renderCard` and the empty state? The empty state must still render when there is nothing to show.
- What happens with auto-rotation and looping in the gentler transition mode? Rotation timing and loop wrapping must behave exactly as today, only the travel changes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The published task deck widget MUST render a visible empty card with a friendly message when there are no tasks to display (no matching tasks, whether the dataset is empty or the active filters exclude everything), instead of rendering nothing.
- **FR-002**: The empty card MUST be visually distinct from a regular task card and communicate that there is nothing to show yet (message wording covers both "no tasks yet" and "no tasks match the filters").
- **FR-003**: The widget MUST keep today's wide-pan card transition as its default behavior, so existing consumers see no change unless they opt in.
- **FR-004**: The widget MUST offer an alternative transition mode that moves the exiting card significantly less horizontally during the changeover while preserving the card-stack, rotation, and swipe-dismiss behaviors.
- **FR-005**: Consumers MUST be able to switch between the default and the gentler transition through the widget's existing configuration surface without changing any other behavior.
- **FR-006**: The widget MUST use a smaller default size than today (compact, suited to short task descriptions) while still gracefully truncating longer descriptions.
- **FR-007**: Consumers MUST be able to override the widget's size to make cards larger, using the widget's existing style surface.
- **FR-008**: All of the above MUST apply to the published component surface (the component that fetches its own data) as well as to the lower-level card stack it is built on, so dashboard consumers get the improvements wherever they embed the widget.

### Key Entities *(include if feature involves data)*

- **Task deck widget**: The published card widget that displays tasks as a swipeable, auto-rotating stack. Attributes that matter here: its tasks input, its active filters, its transition mode (default or gentler), and its size.
- **Empty state**: A presentation-only state of the widget representing "no tasks to display". It is not a data entity; it is the widget's rendering when its visible task set is empty.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With no matching tasks, the widget never renders a blank area — an empty card with a message is visible 100% of the time (verified for both an empty dataset and a fully-filtered-out dataset).
- **SC-002**: The widget's default vertical extent is noticeably smaller than today's default on all screen sizes, while remaining legible for typical short task descriptions.
- **SC-003**: In the gentler transition mode, the exiting card's horizontal travel is substantially reduced compared to the default mode (clearly less than half the sideways travel), with no change in transition duration, rotation, or swipe behavior.
- **SC-004**: Existing consumers who change nothing keep today's animation and can grow the card via a style override; no published component property is removed or renamed.

## Assumptions

- "Published task cards" refers to the procrastinator-tracker module's published task-deck widget family (the widget that can fetch its own data and the lower-level card stack beneath it); the dashboard this is used in is the Home Sweet Home dashboard, not a module to be changed here.
- The current default card size (roughly 24–26rem tall) and the current 500px sideways exit travel are the baselines the smaller size and gentler transition are measured against in planning and testing; they are context, not requirements.
- The gentler transition keeps the same duration, easing, rotation, stack depth, and swipe-dismiss behaviors; only the horizontal travel of the exiting card changes.
- Empty-state messaging wording is flexible but must be human-friendly and cover both "no tasks yet" and "no tasks match the filters"; a single generic message is acceptable.
- Size overrides are provided through the widget's existing style/class surface (no new public API for sizing is required).
- Backward compatibility is required: existing consumers' code keeps working with the current defaults.

---

**Guidance for the planning phase**: the change is confined to the frontend published widget family of the procrastinator-tracker module. All three new behaviors (empty state, gentler transition, compact default) are additive and must ship without removing or renaming any exported member.