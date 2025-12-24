# Specification: Standardize Profile Tab UI & Styles

## 1. Overview
The goal of this track is to standardize the visual design, spacing, and typography across the three main tabs of the Profile screen (`ProfileTab`, `HistoryTab`, and `SettingsTab`). `SettingsTab.js` currently represents the "Gold Standard" for the project's design language. We will extract its styling logic into a centralized theme and create reusable components to ensure long-term consistency and reduce code duplication.

## 2. Functional Requirements

### 2.1 Theme & Design System Update
- **Target File:** `frontend/mobile-app/src/styles/theme.js`
- **Actions:**
    - Analyze `SettingsTab.js` for precise spacing (margins, padding), font sizes, font families, and colors.
    - Update `theme.js` with new constants for these values.
    - Define standard button styles and "Tag/Badge" elements within the theme or a shared stylesheet.

### 2.2 Reusable Component Extraction
- **Target Directory:** `frontend/mobile-app/src/components/Profile/` (Create a `shared/` subdirectory or similar if appropriate).
- **New Components:**
    - `ProfileSection`: A standard card container for grouping items.
    - `ProfileItem`: The standard list row (supporting icon, title, description, value, badge, and right-side elements like Switches or Chevrons).
    - `ProfileBadge`: A standardized tag element for status indicators (e.g., "Verified", "Experimental").
    - `StandardHeader`: The simple header style used in `SettingsTab`.

### 2.3 Component Refactoring
- **ProfileTab.js:** Refactor to use the new shared components and theme constants. Align its spacing and typography with `SettingsTab`.
- **HistoryTab.js:** Refactor to use shared components. Ensure the list layout and header match the standard design.
- **SettingsTab.js:** Refactor to consume the new shared components and theme values (replacing local styles with standardized ones).

## 3. Non-Functional Requirements
- **Consistency:** All three tabs must appear visually identical in terms of layout rhythm, font hierarchy, and interaction patterns.
- **Maintainability:** UI changes made in the future to shared components should automatically reflect across all tabs.

## 4. Acceptance Criteria
- [ ] `src/styles/theme.js` is updated with standard design constants.
- [ ] Reusable components (`ProfileItem`, `ProfileSection`, etc.) exist and are used in all three tabs.
- [ ] `HistoryTab` and `ProfileTab` visuals (spacing, font sizes, buttons) match `SettingsTab`.
- [ ] No regression in existing functionality (e.g., verification logic, navigation, cache clearing).
- [ ] Code duplication for UI patterns is significantly reduced across the three tab files.
