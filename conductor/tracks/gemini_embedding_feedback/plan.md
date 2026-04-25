# Implementation Plan: Gemini Embedding User Feedback

## Objective
Implement a user opt-in feature for Gemini Embedding ("Help us improve our system..."), ensuring embeddings are only generated when the user confirms the prediction correctness after saving a scan.

## Key Files & Context
- `backend/src/models/User.js`: Needs `preferences.geminiEmbeddingEnabled` (Boolean, default: null).
- `backend/src/models/Scan.js`: Needs `userFeedback` schema to track manual corrections.
- `backend/src/controllers/scanController.js`: Extract embedding generation from `saveScan` into a new feedback endpoint.
- `backend/src/routes/scan.js`: Add `POST /:id/feedback` endpoint.
- `frontend/mobile-app/src/screens/HomeScreens/HomeScreen.js`: Add a one-time opt-in modal on mount for users where `geminiEmbeddingEnabled` is null.
- `frontend/mobile-app/src/components/Profile/SettingsTab.js`: Add a toggle for this setting.
- `frontend/mobile-app/src/screens/ScanScreens/FlowerPredictionScreen.js` & `LeafPredictionScreen.js`: Show feedback modal after saving if setting is enabled.

## Implementation Steps
### Phase 1: Backend Database & API
1. Update `User` model: Add `preferences.geminiEmbeddingEnabled` (default `null`).
2. Update `Scan` model: Add `userFeedback: { isCorrect: Boolean, correctVariety: String, correctGender: String }`.
3. Modify `scanController.js` `saveScan`: Remove the automatic `embeddingService.generateAndStore` call.
4. Create new API Endpoint `POST /api/scans/:id/feedback` in `scanController.js` & `scan.js`:
   - Validates user input (isCorrect, correctVariety, correctGender).
   - Updates the Scan document with the feedback.
   - Triggers `embeddingService.generateAndStore` using the *verified* label text.

### Phase 2: Frontend App Settings & Opt-in
1. **API Update**: Ensure the mobile app's profile update service can update `preferences.geminiEmbeddingEnabled`.
2. **Opt-in Modal**: In `HomeScreen.js`, check `user?.preferences?.geminiEmbeddingEnabled == null`. If so, show a beautiful "Help us improve our system..." modal. On accept/reject, call the profile API to save `true` or `false`.
3. **Settings Toggle**: In `SettingsTab.js`, add a toggle switch under a new "Privacy & Data" section to control `geminiEmbeddingEnabled`.

### Phase 3: Frontend Feedback Flow
1. Create a `PredictionFeedbackModal` component. It should ask "Was this prediction correct?" with "Yes" and "No". If "No", expand dropdowns/pickers for Variety and Gender.
2. In `FlowerPredictionScreen.js` and `LeafPredictionScreen.js`:
   - In `handleSave()`, if `geminiEmbeddingEnabled` is true, after a successful save from backend, show the feedback modal instead of the immediate "Success" alert.
   - When the user submits feedback, call `POST /api/scans/:id/feedback`.
   - Then close and return to previous screen with a "Success" alert.

## Verification & Testing
- Start app with an existing user, verify the opt-in modal appears once.
- Toggle the setting in Profile -> Settings.
- Perform a scan. If off, it saves normally without embedding generation. If on, the feedback modal appears.
- Provide "Correct" feedback -> Check backend DB that embedding was generated and feedback saved.
- Provide "Incorrect" feedback -> Correct it -> Check backend DB for updated label and embedding generation.
