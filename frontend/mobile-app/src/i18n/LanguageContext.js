import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = 'appLanguage';

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  isLoading: true,
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (stored) {
          setLanguageState(stored);
          // Also update i18next
          const i18n = require('./i18n').default;
          i18n.changeLanguage(stored);
        }
      } catch (e) {
        console.log('Failed to load language:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = async (lang) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
      setLanguageState(lang);
      const i18n = require('./i18n').default;
      await i18n.changeLanguage(lang);
    } catch (e) {
      console.log('Failed to save language:', e);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
