# Track Plan: Fix Camera Logic and Rename Scan Controller

## Phase 1: Frontend - Camera & Navigation Fixes
*Goal: Resolve the navigation crash and file system errors.*

- [x] Task: Update `handleCapture` in `CameraScreen.js` to navigate to `Results` instead of `ResultsTM`.
- [x] Task: Audit `FileSystem.moveAsync` in `CameraScreen.js`; add checks for source file existence and target directory creation.
- [x] Task: Refine try-catch block in `handleCapture` to provide better error logging for physical device debugging.

## Phase 2: Backend - Refactoring & Cleanup
*Goal: Fix the "scanContoller" typo and update all references.*

- [x] Task: Rename `backend/src/controllers/scanContoller.js` to `backend/src/controllers/scanController.js`.
- [x] Task: Rename `backend/src/controllers/scanContoller.spec.js` to `backend/src/controllers/scanController.spec.js`.
- [x] Task: Update import in `backend/src/routes/scan.js` to point to the renamed `scanController`.
- [x] Task: Update the `require` statement inside `backend/src/controllers/scanController.spec.js`.
- [x] Task: Run the renamed spec file using `node` to verify function exports: `node backend/src/controllers/scanController.spec.js`.

## Phase 3: Final Verification
*Goal: Ensure end-to-end stability.*

- [x] Task: Verify the full capture-to-results flow on a physical Android device.
- [x] Task: Verify that scan-related API endpoints (e.g., `POST /api/scans/save`) still work correctly.
- [x] Task: Conductor - User Manual Verification 'Final Verification' (Protocol in workflow.md)
