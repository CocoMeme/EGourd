# Implementation Plan: Gemini Embedding Settings & Backend Profile Updates

## Objective
Address the edge case where the backend's `updateProfile` endpoint ignores nested `preferences` and ensure the `geminiEmbeddingEnabled` toggle is properly visible and functioning in the mobile app's settings. 

## Key Files & Context
- `backend/src/controllers/localAuthController.js`: Update the `updateProfile` controller to extract and update `preferences`.
- `backend/src/controllers/firebaseAuthController.js`: Update the `updateProfile` controller to extract and update `preferences`.
- `frontend/mobile-app/src/components/Profile/SettingsTab.js`: Re-inject the "Contribute to AI" preference toggle correctly.
- `frontend/mobile-app/src/screens/HomeScreens/HomeScreen.js`: Ensure the `handleOptIn` request sends the proper structured object for old accounts without a `preferences` object.

## Implementation Steps

### Phase 1: Backend Profile Controller Updates
1. Modify `updateProfile` in `localAuthController.js` to accept `preferences` from `req.body`.
2. Add logic: `if (preferences && preferences.geminiEmbeddingEnabled !== undefined)` then initialize `user.preferences` if it doesn't exist, and set `user.preferences.geminiEmbeddingEnabled = preferences.geminiEmbeddingEnabled`.
3. Do the same for `updateProfile` in `firebaseAuthController.js` to ensure consistency.

### Phase 2: Frontend Settings Tab UI
1. In `SettingsTab.js`, verify and prepend the `geminiEmbedding` object into the `preferenceItems` array. Ensure the toggle connects directly to `authService.updateProfile` and correctly modifies the `preferences` block.
2. Add a `geminiEmbeddingEnabled` fallback state for legacy accounts.

### Phase 3: Frontend Home Screen Opt-In
1. Update `handleOptIn` in `HomeScreen.js` to ensure the nested payload matches the new backend format: `{ preferences: { geminiEmbeddingEnabled: value } }`. This already safely triggers for `undefined` preferences.

## Verification & Testing
- Load an old user account via the API to verify the `undefined` evaluation triggers the modal on `HomeScreen`.
- Select an option on the modal and verify the backend correctly saves the nested preferences block.
- Navigate to the Profile -> Settings page and toggle the "Contribute to AI" switch. Verify it correctly toggles and updates the backend.
