# Specification: Refactor ProfileScreen.js

## 1. Overview
The goal of this track is to refactor the existing `ProfileScreen.js` in the mobile application to improve code maintainability and readability. The current monolithic file will be decomposed into smaller, focused components representing its three main tabs: Profile, History, and Settings. Additionally, the `StorageSettingsScreen.js` logic and UI will be merged directly into the new Settings component.

## 2. Functional Requirements

### 2.1 Component Decomposition
- **Target Directory:** Create a new directory `frontend/mobile-app/src/components/Profile/` to house the new components.
- **New Components:**
    1.  `ProfileTab.js`: Encapsulates the logic and UI for the "Profile" view.
    2.  `HistoryTab.js`: Encapsulates the logic and UI for the "History" view.
    3.  `SettingsTab.js`: Encapsulates the logic and UI for the "Settings" view.
- **Container Update:**
    - Update `ProfileScreen.js` to import and render these three new components based on the active tab state, reducing its overall line count and complexity.

### 2.2 Settings Integration
- **Merge Operation:** The functionality and UI of `StorageSettingsScreen.js` must be integrated directly into the new `SettingsTab.js`.
- **Simplification:** `StorageSettingsScreen.js` should likely be deprecated or removed after successful integration.

### 2.3 Design Consistency & UI Components
- **Visual Style:** All three new components (`ProfileTab`, `HistoryTab`, `SettingsTab`) must adopt the visual design patterns (styling, colors, layout structures) currently found in `StorageSettingsScreen.js`.
- **Header Design:** The specific header styling from `StorageSettingsScreen.js` must be replicated across all new components.
- **Back Button Icon:**
    -   Replace standard arrow back icons with a "less than symbol" (<) icon (e.g., using a ChevronLeft or similar simple icon).
    -   This specific icon style must be used for every back button implemented or modified within this track to ensure consistency.

## 3. Non-Functional Requirements
- **Functionality:** The refactor must strictly maintain all existing functionality. There should be no regression in user features.
- **Code Quality:** Ensure clean imports and proper prop drilling (if necessary) between the container and child components.

## 4. Acceptance Criteria
- [x] `ProfileScreen.js` is significantly shorter and acts primarily as a navigational container.
- [x] `ProfileTab.js`, `HistoryTab.js`, and `SettingsTab.js` exist in `frontend/mobile-app/src/components/Profile/`.
- [x] The "Settings" tab fully supports the features previously found in `StorageSettingsScreen.js`.
- [x] All three tabs utilize the header style from `StorageSettingsScreen.js`.
- [x] All back buttons within these components use the "less than symbol" icon.
- [x] The application compiles and runs without errors.
- [x] Navigation between tabs works exactly as before.
