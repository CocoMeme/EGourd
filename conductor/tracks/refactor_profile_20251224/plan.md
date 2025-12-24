# Implementation Plan: Refactor ProfileScreen.js

## Overview
Refactor `ProfileScreen.js` into smaller, tab-based components (`ProfileTab`, `HistoryTab`, `SettingsTab`) and merge `StorageSettingsScreen.js` into the `SettingsTab`. Apply consistent styling based on `StorageSettingsScreen` header and use the "less than" symbol icon for back buttons.

## Phase 1: Preparation & Component Scaffolding
- [x] Create `frontend/mobile-app/src/components/Profile/` directory (Done)
- [x] Create `ProfileTab.js` skeleton
- [x] Create `HistoryTab.js` skeleton
- [x] Create `SettingsTab.js` skeleton
- [x] Create `index.js` in `frontend/mobile-app/src/components/Profile/` for clean exports
- [x] Task: Conductor - User Manual Verification 'Phase 1: Preparation & Component Scaffolding' (Protocol in workflow.md)

## Phase 2: Profile Tab Implementation
- [x] Extract profile-specific logic (user data, verification) from `ProfileScreen.js` to `ProfileTab.js`
- [x] Replicate `ProfileScreen` profile UI inside `ProfileTab.js`
- [x] Apply the requested header style (from `StorageSettingsScreen.js`) to `ProfileTab.js`
- [x] Ensure the "less than" back icon is used if applicable (though Profile tab is a root tab)
- [x] Task: Conductor - User Manual Verification 'Phase 2: Profile Tab Implementation' (Protocol in workflow.md)

## Phase 3: History Tab Implementation
- [x] Create `HistoryTab.js` as a wrapper/refactor of `HistoryScreen.js`
- [x] Apply the requested header style (from `StorageSettingsScreen.js`) to `HistoryTab.js`
- [x] Implement the "less than" symbol back icon if there's a back button
- [x] Ensure navigation to `Results` screen still works
- [x] Task: Conductor - User Manual Verification 'Phase 3: History Tab Implementation' (Protocol in workflow.md)

## Phase 4: Settings Tab & Storage Integration
- [x] Extract settings items and logout logic from `ProfileScreen.js` to `SettingsTab.js`
- [x] Merge logic from `StorageSettingsScreen.js` (cache calculation, clear cache) into `SettingsTab.js`
- [x] Implement the combined UI in `SettingsTab.js` using the standard header style
- [x] Replace standard arrow-back with "less than" icon in the settings header (if navigating to sub-sections or if the tab itself has a back action to return to main profile view - although it's a tab)
- [x] Task: Conductor - User Manual Verification 'Phase 4: Settings Tab & Storage Integration' (Protocol in workflow.md)

## Phase 5: Container Refactoring
- [x] Update `ProfileScreen.js` to use the new tab components
- [x] Simplify `ProfileScreen.js` state management (pass down necessary props)
- [x] Update `ProfileStack.js` navigation to handle the consolidated screens
- [x] Task: Conductor - User Manual Verification 'Phase 5: Container Refactoring' (Protocol in workflow.md)

## Phase 6: Finalization & Cleanup
- [x] Deprecate/Remove `frontend/mobile-app/src/screens/AccountScreens/StorageSettingsScreen.js`
- [x] Verify all back buttons in the affected screens use the "less than" icon
- [x] Final UI/UX review for design consistency
- [x] Task: Conductor - User Manual Verification 'Phase 6: Finalization & Cleanup' (Protocol in workflow.md)
