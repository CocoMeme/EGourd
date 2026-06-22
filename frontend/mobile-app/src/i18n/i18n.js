import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import en from './locales/en.json';
import tl from './locales/tl.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    tl: { translation: tl },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v3',
});

// After init, check for stored language preference or device locale
AsyncStorage.getItem('appLanguage').then((stored) => {
  if (stored) {
    i18n.changeLanguage(stored);
  } else {
    const deviceLocale = Localization.getLocales?.()?.[0]?.languageCode;
    if (deviceLocale === 'tl') {
      i18n.changeLanguage('tl');
    }
  }
}).catch((error) => {
  console.log('Failed to load language preference:', error);
});

export default i18n;
