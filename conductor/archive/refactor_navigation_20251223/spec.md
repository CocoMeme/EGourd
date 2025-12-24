# Spec: Refactor Navigation for Consistent Routing Behavior

## Overview
This track aims to refactor the mobile application's routing system to ensure a centralized, predictable navigation experience. Specifically, it addresses the issue where navigating from the Home screen to a scan result redirects the user to the Camera tab's stack, causing the back button to incorrectly return the user to the Camera screen instead of the Home screen.

## Functional Requirements
- **Unified Stack Configuration:** Audit and simplify existing navigators in `src/navigation/stacks/` to ensure a consistent nesting structure.
- **Explicit Navigation State:** Implement a "return-to" parameter logic. When navigating to screens like `ResultsScreen` from non-primary tabs (e.g., Home), a navigation parameter will specify the intended return destination.
- **Programmatic Back Behavior:** Update the header and back-button logic in target screens to check for the `returnTo` parameter and navigate accordingly.

## Non-Functional Requirements
- **Maintainability:** Reduce complexity in navigation definitions.
- **Performance:** Ensure no significant lag during transitions.

## Acceptance Criteria
- [ ] Clicking a recent scan record on the Home screen navigates to the result detail.
- [ ] Pressing "Back" from that result detail correctly returns the user to the Home screen.
- [ ] Navigation from the Camera tab to the result detail still returns the user to the Camera screen (preserving standard flow).
- [ ] All navigation stacks follow a consistent organizational pattern in the codebase.

## Out of Scope
- Migrating to Expo Router.
- Redesigning the visual style of headers.
