# Feature Specification: Weather Psychic

**Feature Branch**: `007-weather-psychic`

**Created**: 2026-10-04

**Status**: Draft

**Input**: User description: "i want a new module, backend (rest + mcp) and frontend (spa + storybook) for the weather. lets call it 'weather-psychic'. i want to display what is the weather currently and to come. i want to have the following information separated into two separate components: 1) current weather in detailed format and with a nice graphic display for current weather + hourly weather, auto scrolling to the right, not showing the current as this 2) daily weather in a list format not including current day, with prediction to come for the following days in a very succinct manner. location should be selectable and configurable for components."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Current Weather in Detail (Priority: P1)

As a user, I open the Weather Psychic page and immediately see the current weather for my location in a detailed format with a graphic display — the current temperature, the condition, and supporting details (feels-like, humidity, wind, and related measures) — so I know exactly what it is like outside right now at a glance.

**Why this priority**: Showing the current weather is the core of the module. Without it there is no feature; the hourly and daily views build on the same location and data foundation.

**Independent Test**: Open the module page for a known location and verify a detailed, graphic current-weather display shows the current temperature and condition plus supporting detail fields that match the data source for that time and location.

**Acceptance Scenarios**:

1. **Given** the module page with a location selected, **When** the page loads, **Then** the current weather is displayed in a detailed, graphic format showing the current temperature and condition plus supporting details (feels-like, humidity, wind, and at least two more measures such as precipitation and UV).
2. **Given** the current weather display, **When** I compare its values to the weather source for the same location and time, **Then** they match (within the source's freshness).
3. **Given** the current weather display, **When** the location is changed, **Then** the display updates to the new location without showing stale data from the previous one.
4. **Given** the current weather display and no reachable weather source, **Then** the module shows a clear state (last-known data if available, otherwise a clear message) rather than a broken or blank area.

---

### User Story 2 - Hourly Forecast with Auto-Scrolling Graphic (Priority: P1)

As a user, alongside the current weather I see a graphic hourly forecast strip that automatically scrolls to the right through the coming hours — starting after the current hour — so I can watch how the weather is predicted to evolve over the next several hours without touching it.

**Why this priority**: The hourly graphic strip is an explicit, half of the "current + to come" ask and part of the module's flagship component. It is independently testable from the daily list.

**Independent Test**: Render the hourly strip and verify it shows the coming hours starting from the next hour (never the current hour), that it auto-scrolls to the right over time, and that it handles the end of the available hours without breaking.

**Acceptance Scenarios**:

1. **Given** the hourly strip, **When** it renders, **Then** it shows hourly forecasts for the coming hours, starting from the next hour — the current hour is not shown in the strip.
2. **Given** the hourly strip, **When** time passes, **Then** it auto-scrolls to the right, revealing later hours without requiring interaction.
3. **Given** the hourly strip, **When** it reaches the end of the available hourly data, **Then** it stops or wraps gracefully with no broken layout or glitch.
4. **Given** the module page, **When** the current hour changes to a new hour, **Then** the strip advances and continues to omit the now-current hour.
5. **Given** the hourly strip and the current weather display, **When** both are shown together, **Then** the current hour appears once (in the current weather display) and is not duplicated in the strip.

---

### User Story 3 - Daily Forecast in a Compact List (Priority: P1)

As a user, I see a compact list of the upcoming days' weather — excluding today — where each day is a very succinct summary (day, condition, low/high temperature), so I can plan ahead for the coming days at a glance.

**Why this priority**: The daily list is the second explicit component and the "to come" half of the ask, independent of the current/hourly component.

**Independent Test**: Render the daily list on any date and verify the first entry is tomorrow (never today), every entry is a succinct summary, and the list stays compact and scannable.

**Acceptance Scenarios**:

1. **Given** the daily list, **When** it renders, **Then** it shows the following days starting from tomorrow — the current day is not included.
2. **Given** a day in the list, **When** I read it, **Then** it shows a very succinct summary (day, condition, and low/high temperature, plus precipitation if relevant).
3. **Given** the daily list, **When** the date rolls over to a new day, **Then** the list drops today's former entry and shows the new tomorrow.
4. **Given** a long daily forecast horizon, **When** the list renders, **Then** it remains compact and scannable rather than sprawling.

---

### User Story 4 - Selectable, Configurable Location (Priority: P1)

As a user, I can choose the location whose weather is displayed; as a developer, I can configure a location for each component, so the same components can be reused to show the weather for any place I care about.

**Why this priority**: Weather is meaningless without a place. Selectable location in the page and configurable location on the components make both the page and the published widgets useful.

**Independent Test**: In the page, choose a location and confirm the current, hourly, and daily views update to it and that the choice is remembered; then configure a location on each component and confirm it renders that location's weather.

**Acceptance Scenarios**:

1. **Given** the module page, **When** I select a location, **Then** the current, hourly, and daily views all update to that location.
2. **Given** a location I have selected, **When** I revisit the page, **Then** my choice is remembered.
3. **Given** a component configured with a location, **When** it renders, **Then** it shows the weather for that configured location.
4. **Given** a component with no location configured, **When** it renders, **Then** it falls back to a sensible default location or clearly prompts to select one.
5. **Given** a location that cannot be resolved, **When** the page or a component requests its weather, **Then** a clear, user-friendly error is shown and no wrong location's data is presented.

---

### User Story 5 - Weather Data via the Application Interfaces (Priority: P2)

As a developer, I can retrieve current, hourly, and daily weather for a location through both of the module's application interfaces — the REST API and the MCP server — so other modules and automated assistants can query the weather programmatically.

**Why this priority**: The module ships a backend with two interfaces by request. These serve programmatic consumers and underpin the frontend; they are secondary to the on-screen experience but required for the module's stated shape.

**Independent Test**: Request weather for the same location and time through the REST interface and through the MCP server, and confirm both return the same current, hourly, and daily data.

**Acceptance Scenarios**:

1. **Given** the REST interface, **When** I request weather for a location, **Then** I receive current, hourly, and daily forecast data.
2. **Given** the MCP server, **When** an assistant calls its weather capability for a location, **Then** it returns the same current, hourly, and daily data.
3. **Given** an unknown or unresolvable location, **When** either interface is used, **Then** a clear error is returned.
4. **Given** the same location and time, **When** queried through both interfaces, **Then** the returned data is consistent between them.

---

### User Story 6 - Component Workbench & Documentation (Priority: P2)

As a developer, I have an interactive workbench where I can preview both weather components — the current/hourly and the daily — with configurable locations, and read a written guide for each, so I can evaluate and document them before publishing.

**Why this priority**: Previewability and documentation make the published components usable and discoverable; valuable, but only once the components exist to document.

**Independent Test**: Open the workbench, preview both components with at least two different locations, and read each component's documentation page.

**Acceptance Scenarios**:

1. **Given** the workbench, **When** I open it, **Then** I can preview the current/hourly component and the daily component, each with configurable locations.
2. **Given** the workbench, **When** I open a component's documentation page, **Then** it describes the component and its location configuration with runnable previews.

---

### Edge Cases

- The current hour boundary is crossed while the hourly strip is open — the strip advances and still omits the now-current hour; the current weather display updates.
- Midnight rollover — the daily list drops today's entry and starts at the new tomorrow without duplication or a gap.
- A location cannot be resolved or has no weather data (for example, a very remote place) — a clear error/empty state is shown, and no stale or wrong-location data is presented.
- The weather source is unreachable (offline or outage) — the module shows last-known data if available, otherwise a clear message; it never renders a blank or broken widget.
- The hourly data runs out — the strip stops or wraps gracefully with no broken layout.
- The user changes location while a request is in flight — the view must not flash data from the previous location.
- A very long location name is selected — the display truncates gracefully without breaking the layout.
- The page is embedded in a narrow or very tall container — both components remain legible and do not overflow.
- Daily forecast horizon is long — the list remains compact and scannable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The module MUST display the current weather for the selected location in a detailed, graphic format, including at minimum the current temperature, the condition, and supporting detail fields (feels-like, humidity, wind, precipitation, and at least one more measure such as UV or pressure).
- **FR-002**: The module MUST display an hourly forecast with a graphic presentation that automatically scrolls to the right over time, showing the coming hours without requiring user interaction.
- **FR-003**: The hourly forecast MUST start from the next hour and MUST NOT include the current hour; the current hour is shown only in the current weather display.
- **FR-004**: The hourly auto-scroll MUST end gracefully when the available hourly data is exhausted (stop or wrap) with no broken layout, and MUST continue to omit the current hour as hours advance.
- **FR-005**: The module MUST display a daily forecast as a compact list of the upcoming days starting from tomorrow; the current day MUST NOT be included.
- **FR-006**: Each daily entry MUST be a very succinct summary consisting of the day, the condition, and the low/high temperature (with precipitation when relevant), and the list MUST remain compact and scannable.
- **FR-007**: The user MUST be able to select the location displayed on the module page, and the selection MUST be remembered for subsequent visits.
- **FR-008**: Both published components MUST accept a configurable location so consumers can render the weather for any place; with no location configured, the component MUST fall back to a sensible default or clearly prompt.
- **FR-009**: When the location changes, the current, hourly, and daily views MUST all update consistently to the new location without showing stale data from the previous one.
- **FR-010**: The module MUST provide current, hourly, and daily weather data through both a REST interface and an MCP server, and both interfaces MUST return consistent data for the same location and time.
- **FR-011**: When a location cannot be resolved or has no data, the module MUST show a clear, user-friendly error through the page, the components, and both application interfaces.
- **FR-012**: The module MUST remain functional in line with the local-first principle: when the external weather source is unreachable, it MUST present last-known data if available or a clear empty state, never a broken or blank widget.
- **FR-013**: The module MUST provide an interactive component workbench where both components can be previewed with configurable locations, plus a written documentation page for each component.
- **FR-014**: The module page and the published components MUST follow the shared visual language of the Home Sweet Home ecosystem (light palette, white cards, amber accents).

### Key Entities *(include if feature involves data)*

- **Location**: The place the weather is reported for. Attributes: name/label, geographic coordinates, timezone. Selectable by the user on the page and configurable per component; resolved from user input.
- **Current weather**: The weather at a location at the current time. Attributes: timestamp, temperature, condition, feels-like, humidity, wind, precipitation, and additional detail measures.
- **Hourly forecast**: An ordered sequence of hourly snapshots for the coming hours at a location. Attributes per entry: timestamp, temperature, condition, precipitation probability. Excludes the current hour.
- **Daily forecast**: An ordered sequence of per-day summaries for the upcoming days at a location. Attributes per entry: date, condition, low/high temperature, precipitation. Excludes the current day.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user opening the module page sees the detailed current weather for their location within 2 seconds of the data being available.
- **SC-002**: The hourly strip never shows the current hour and auto-scrolls through the coming hours gracefully — it never causes a broken layout or an abrupt visible glitch, verified across at least 24 consecutive hours of data.
- **SC-003**: The daily list always starts at tomorrow and never includes today, verified for any date on which the module runs.
- **SC-004**: Users can change the displayed location with at most 3 interactions, and the choice is remembered on return visits.
- **SC-005**: For the same location and time, the REST and MCP interfaces return identical current, hourly, and daily data (interface parity).
- **SC-006**: With no connectivity to the external weather source, the module still presents a clear state (last-known data or a clear message) 100% of the time and never renders a blank or broken widget.
- **SC-007**: A component configured with location A never shows location B's data, and changing the page location updates all views consistently with no stale data flash.
- **SC-008**: In the component workbench, both components can be previewed across at least two different locations, and a documentation page exists for each component.

## Assumptions

- "Weather Psychic" is the module's name and slug; the module lives at `modules/weather-psychic/` with packages named `@sousa99/weather-psychic-*` and a registered changesets fixed release group, consistent with the other modules.
- The module has the requested shape: a backend exposing REST and MCP interfaces, and a frontend with an SPA and a component workbench (Storybook).
- "Not showing the current as this" is interpreted as: the hourly strip excludes the current hour (and the daily list excludes the current day), so both "to come" views show future periods only; the current weather is displayed in its own detailed section.
- Weather data is inherently external: the backend integrates a free, keyless weather provider as the primary source, with the external dependency documented and offline behavior defined per the local-first, private-by-default principle (opt-in external access).
- A location is expressed as a named place with geographic coordinates; the page offers a location picker, and each component accepts a location configuration.
- Forecasts refresh on load and periodically while the page is open; the exact refresh interval is a planning decision.
- The components are designed to be embedded in other Home Sweet Home surfaces (like the current-time widgets) with a configurable location, and follow the shared visual language.
- The feature targets a single household user, consistent with the local-first, private-by-default principle.

---

**Guidance for the planning phase**: this is a new self-contained module following the standard shape (backend with REST + MCP, frontend with SPA + Storybook, Dockerfiles, README, setup.md). The published surface is two components — one for current + hourly weather, one for daily weather — plus a location selection surface. Identity, packaging, and quality gates follow the constitution and repository conventions.