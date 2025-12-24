# Implementation Plan: Standardize Profile Tab UI & Styles

## Overview
Extract styling constants from `SettingsTab.js` into `theme.js` and create reusable UI components (`ProfileItem`, `ProfileSection`, etc.) to standardize the look and feel across `ProfileTab`, `HistoryTab`, and `SettingsTab`.

## Phase 1: Analysis & Theme Centralization
- [x] Analyze `SettingsTab.js` and `StorageSettingsScreen.js` (logic/styles moved to tab) to identify exact spacing, font sizes, and colors.
- [x] Update `frontend/mobile-app/src/styles/theme.js` with identified design constants (e.g., `theme.spacing.profile`, `theme.typography.profileItem`).
- [x] Task: Conductor - User Manual Verification 'Phase 1: Analysis & Theme Centralization' (Protocol in workflow.md)

## Phase 2: Shared Component Scaffolding
- [x] Create `frontend/mobile-app/src/components/Profile/shared/` directory.
- [x] Implement `ProfileSection.js`: Standard card container with consistent shadows and margins.
- [x] Implement `ProfileBadge.js`: Standardized tag/badge element for status indicators.
- [x] Implement `ProfileItem.js`: Universal list row supporting icons, titles, descriptions, values, badges, and interactive elements (Switches/Chevrons).
- [x] Implement `StandardHeader.js`: The simple, clean header bar with standard typography and the "less than" back icon.
- [x] Create `index.js` in `shared/` for clean exports.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Shared Component Scaffolding' (Protocol in workflow.md)

## Phase 3: SettingsTab Refactoring
- [x] Update `SettingsTab.js` to import and use the new shared components.
- [x] Remove local style definitions in `SettingsTab.js` that are now handled by shared components or the central theme.
- [x] Verify that the visual appearance of the "Gold Standard" tab remains identical.
- [x] Task: Conductor - User Manual Verification 'Phase 3: SettingsTab Refactoring' (Protocol in workflow.md)

## Phase 4: ProfileTab & HistoryTab Refactoring
- [x] Update `ProfileTab.js` to use shared components (`ProfileSection`, `ProfileItem`, `StandardHeader`).
- [x] Update `HistoryTab.js` to use shared components and align its list layout with the standard.
- [x] Ensure all font sizes and spacings in these tabs precisely match the updated theme.
- [x] Task: Conductor - User Manual Verification 'Phase 4: ProfileTab & HistoryTab Refactoring' (Protocol in workflow.md)

## Phase 5: Verification & Cleanup
- [x] Conduct a final visual pass across all three tabs to ensure perfect alignment and consistency.
- [x] Verify all back buttons correctly use the "less than" icon pattern.
- [x] Ensure no regressions in functionality (e.g., toggle switches, navigation to Results, cache clearing).
- [x] Task: Conductor - User Manual Verification 'Phase 5: Verification & Cleanup' (Protocol in workflow.md)
