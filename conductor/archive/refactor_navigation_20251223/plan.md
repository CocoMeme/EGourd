# Plan: Refactor Navigation for Consistent Routing Behavior

This plan outlines the steps to refactor the React Navigation structure and implement explicit navigation state to fix the 'back button' redirect issue.

## Phase 1: Audit and Preparation
- [x] Task: Audit current stack configurations in `src/navigation/stacks/` to identify redundant or inconsistent nesting.
- [x] Task: Define a standard pattern for passing and handling the `returnTo` navigation parameter.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Audit and Preparation' (Protocol in workflow.md)

## Phase 2: Refactor Navigation Logic
- [x] Task: Update `HomeStack` and `CameraStack` to ensure they share access to common detail screens (like Results) consistently.
- [x] Task: Implement the `returnTo` parameter logic in the Home screen's navigation calls to Recent Scans.
- [x] Task: Update `ResultsScreen` (and any other relevant detail screens) to handle the `returnTo` parameter in their header back action or `useFocusEffect` / `useEffect` cleanup if necessary.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Refactor Navigation Logic' (Protocol in workflow.md)

## Phase 3: Verification and Cleanup
- [x] Task: Verify fix: Home -> Recent Scan -> Back correctly returns to Home.
- [x] Task: Verify fix: Camera -> Scan Result -> Back correctly returns to Camera.
- [x] Task: Perform a final sweep of `src/navigation/stacks/` to ensure all files follow the new "Simplified Unified" pattern.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Verification and Cleanup' (Protocol in workflow.md)