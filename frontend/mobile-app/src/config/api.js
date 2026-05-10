// ⚠️ SINGLE SOURCE OF TRUTH FOR API CONFIGURATION ⚠️
// Set the backend URL via environment variable:
// EXPO_PUBLIC_API_URL=https://<your-render-service>.onrender.com/api
//
// Notes:
// - The mobile app expects API routes to be under `/api`.
// - You may provide either `https://host` or `https://host/api`; we normalize it.
// - At runtime, a URL override stored in AsyncStorage takes priority over the env var.
//   Use setApiUrlOverride() (e.g. from Settings) to persist a custom URL across restarts.

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL_OVERRIDE_KEY = '@egourd_api_url_override';

export const normalizeApiBaseUrl = (rawUrl) => {
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
  const productionFallback = 'https://gourdvision.onrender.com/api';
  console.warn('⚠️ EXPO_PUBLIC_API_URL missing in production; defaulting to:', productionFallback);
  return productionFallback;
};

// ── Runtime override ──────────────────────────────────────────────────────────
// Starts as the env-baked value; replaced by initApiUrl() once AsyncStorage loads.
let _activeUrl = getApiUrl();

/**
 * Returns the currently active API base URL.
 * Always call this at request time (not at module-load time) so runtime overrides apply.
 */
export const getActiveApiUrl = () => _activeUrl;

/**
 * Persist a custom API URL and apply it immediately for the current session.
 * Pass null / empty string to clear the override and revert to the env value.
 */
export const setApiUrlOverride = async (url) => {
  if (url && url.trim()) {
    const normalized = normalizeApiBaseUrl(url.trim());
    _activeUrl = normalized;
    await AsyncStorage.setItem(API_URL_OVERRIDE_KEY, url.trim());
  } else {
    _activeUrl = getApiUrl();
    await AsyncStorage.removeItem(API_URL_OVERRIDE_KEY);
  }
  console.log('📡 API URL updated to:', _activeUrl);
};

/** Read a stored override from AsyncStorage and apply it. Call once at app startup. */
export const initApiUrl = async () => {
  try {
    const stored = await AsyncStorage.getItem(API_URL_OVERRIDE_KEY);
    if (stored && stored.trim()) {
      _activeUrl = normalizeApiBaseUrl(stored.trim());
      console.log('📡 Using stored API URL override:', _activeUrl);
    }
  } catch {
    // Non-fatal — fall back to env value
  }
};

/** Returns the raw stored override string (not normalized), or null if none is set. */
export const getStoredApiUrlOverride = async () => {
  try {
    return await AsyncStorage.getItem(API_URL_OVERRIDE_KEY);
  } catch {
    return null;
  }
};

// Backward-compat static exports (value frozen at bundle time — use getActiveApiUrl() for dynamic use)
export const API_BASE_URL = getApiUrl();
export const BACKEND_URL = API_BASE_URL;

// Log the API URL in development
if (__DEV__) {
  console.log('📡 API Base URL (env):', API_BASE_URL);
}

export default API_BASE_URL;
