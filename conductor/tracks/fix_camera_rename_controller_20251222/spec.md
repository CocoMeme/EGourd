# Track Specification: Fix Camera Navigation, Capture Logic, and Rename Scan Controller

## Overview
This track addresses three distinct issues:
1.  **Camera Navigation:** `CameraScreen.js` incorrectly navigates to `ResultsTM` instead of `Results`.
2.  **File System Error:** `ExponentFileSystem.moveAsync` fails during image capture, likely due to path/permissions issues on physical devices.
3.  **Refactoring:** `scanContoller.js` and its spec file have a typo in their filenames and need to be renamed to `scanController.js` (fixing "Contoller" -> "Controller").

## Functional Requirements
1.  **Correct Navigation:** Update `CameraScreen.js` to navigate to the `Results` screen.
2.  **Robust Image Saving:** Refine `handleCapture` in `CameraScreen.js` to verify file existence and target paths before attempting `moveAsync`.
3.  **Rename Controller:** Rename `backend/src/controllers/scanContoller.js` to `backend/src/controllers/scanController.js` and `backend/src/controllers/scanContoller.spec.js` to `backend/src/controllers/scanController.spec.js`.
4.  **Update References:** Update all imports requiring the scan controller (e.g., in `backend/src/routes/scan.js` and the spec file itself).

## Acceptance Criteria
- [ ] Tapping capture in `CameraScreen.js` saves the image without crashing.
- [ ] App navigates to the `Results` screen after capture.
- [ ] Backend file `scanController.js` exists with the correct name.
- [ ] Backend tests (`npm test` or specific spec execution) pass for `scanController`.
- [ ] Backend API endpoints for scans continue to function (verified via manual check or test).

## Out of Scope
- Changing the actual TFLite model logic.
