# Track Plan: Optimize Gourd Classification

## Phase 0: Fix Results Screen Discrepancy
*Goal: Ensure the main ResultsScreen uses the latest TM+Gemini logic.*

- [x] Task: Replace `ResultsScreen.js` with content from `ResultsScreenTM.js` and rename imports
- [x] Task: Remove `ResultsScreenTM.js` and update navigation references
- [x] Task: Conductor - User Manual Verification 'Phase 0: Fix Results Screen Discrepancy' (Protocol in workflow.md)

## Phase 1: TFLite Integration Refinement (Mobile App)
*Goal: Improve the reliability and accuracy of on-device classification.*

- [x] Task: Define confidence thresholds and error types for classification
- [x] Task: Implement confidence-based filtering in `CameraScreen.js`
- [x] Task: Enhance image preprocessing for TFLite model input
- [x] Task: Conductor - User Manual Verification 'Phase 1: TFLite Integration Refinement' (Protocol in workflow.md)

## [x] Phase 2: Gemini Harvest Prediction Enhancement (Backend)
*Goal: Leverage Gemini API for more accurate and detailed harvest insights.*

- [x] Task: Refine Gemini prompt structure in `geminiService.js`
- [x] Task: Update prediction controller to include environmental context
- [x] Task: Implement structured response parsing for Gemini output
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Gemini Harvest Prediction Enhancement' (Protocol in workflow.md)

## [x] Phase 3: Integration & UX Polish (Full Stack)
*Goal: Ensure a seamless and visually clean end-to-end user flow.*

- [x] Task: Update `ResultsScreen.js` (formerly ResultsScreenTM) to display detailed harvest rationales
- [x] Task: Implement "Clean & Modern" UI refinements for the results display
- [x] Task: Perform end-to-end integration testing (Mobile to Backend)
- [x] Task: Conductor - User Manual Verification 'Phase 3: Integration & UX Polish' (Protocol in workflow.md)