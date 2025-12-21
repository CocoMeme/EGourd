# Track Specification: Optimize Gourd Classification

## Overview
This track focuses on improving the accuracy and robustness of the Gourd Classification System. It involves refining the on-device TensorFlow Lite (TFLite) integration for real-time identification and enhancing the AI-driven harvest prediction using the Gemini API.

## Objectives
- **Robust Identification:** Implement confidence thresholds and better error handling for the on-device TFLite model.
- **Enhanced Harvest Prediction:** Refine the backend logic for harvest prediction using the Gemini API, incorporating more environmental and visual context.
- **Improved UX:** Ensure classification results and predictions are presented clearly following the "Clean & Modern" design guidelines.

## Technical Details

### Mobile Application (React Native / Expo)
- **TFLite Integration:** Refine the use of `react-native-fast-tflite` in `CameraScreen` and `ResultsScreenTM`.
- **Confidence Scoring:** Implement logic to filter out low-confidence predictions.
- **Image Preprocessing:** Optimize image resizing and normalization before passing to the TFLite model.

### Backend (Node.js / Express)
- **Gemini Service:** Update `geminiService.js` to use more structured prompts for harvest prediction.
- **Contextual Data:** Pass additional parameters (e.g., date of scan, inferred growth stage) to the Gemini API to improve prediction accuracy.
- **API Response:** Ensure the backend returns a structured JSON response for predictions.

## Success Criteria
- TFLite model accurately identifies gourds with a confidence score > 80% in controlled lighting.
- Harvest predictions provide a specific timeframe and a rationale for the prediction.
- All code changes meet the >80% test coverage requirement.
