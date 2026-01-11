// ⚠️ SINGLE SOURCE OF TRUTH FOR API CONFIGURATION ⚠️
// Set the backend URL via environment variable:
// EXPO_PUBLIC_API_URL=https://<your-render-service>.onrender.com/api
//
// Notes:
// - The mobile app expects API routes to be under `/api`.
// - You may provide either `https://host` or `https://host/api`; we normalize it.

const normalizeApiBaseUrl = (rawUrl) => {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';

  // Remove trailing slashes to avoid accidental double-slashes when concatenating.
  const withoutTrailingSlashes = trimmed.replace(/\/+$/, '');

  // If the caller already included an /api segment (e.g., /api or /api/v1), keep it.
  if (/\/api(\/|$)/i.test(withoutTrailingSlashes)) {
    return withoutTrailingSlashes;
  }

  // Otherwise, append /api.
  return `${withoutTrailingSlashes}/api`;
};

export const getApiUrl = () => {
  const configured = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_URL);
  if (configured) return configured;

  // Dev fallback: safe for emulators/simulators. For physical devices, set EXPO_PUBLIC_API_URL.
  if (__DEV__) {
    const fallback = normalizeApiBaseUrl('http://localhost:5000/api');
    console.warn(
      '⚠️ EXPO_PUBLIC_API_URL is not set; falling back to',
      fallback,
      '(emulator-only). Set EXPO_PUBLIC_API_URL in frontend/mobile-app/.env for real devices.'
    );
    return fallback;
  }

  // Fallback for production if env var is missing (prevents crash, defaults to Prod)
  const productionFallback = 'https://egourd.onrender.com/api';
  console.warn('⚠️ EXPO_PUBLIC_API_URL missing in production; defaulting to:', productionFallback);
  return productionFallback;
};

// Export for direct use
export const API_BASE_URL = getApiUrl();

// Also export as BACKEND_URL for compatibility
export const BACKEND_URL = API_BASE_URL;

// Log the API URL in development
if (__DEV__) {
  console.log('📡 API Base URL:', API_BASE_URL);
}

export default API_BASE_URL;
