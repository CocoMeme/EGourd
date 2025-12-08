/**
 * DeveloperModeContext - Global state management for developer mode toggle
 * Allows switching between AppNavigator and DeveloperNavigator
 * Persists state to AsyncStorage for persistence across app restarts
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEV_MODE_KEY = 'developerModeEnabled';

const DeveloperModeContext = createContext({
  isDeveloperMode: false,
  setDeveloperMode: () => {},
  isLoading: true,
});

export const DeveloperModeProvider = ({ children }) => {
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load developer mode state from AsyncStorage on mount
  useEffect(() => {
    loadDeveloperModeState();
  }, []);

  const loadDeveloperModeState = async () => {
    try {
      const value = await AsyncStorage.getItem(DEV_MODE_KEY);
      if (value !== null) {
        setIsDeveloperMode(value === 'true');
        console.log('🔧 Developer mode loaded:', value === 'true');
      }
    } catch (error) {
      console.error('Error loading developer mode state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setDeveloperMode = async (enabled) => {
    try {
      await AsyncStorage.setItem(DEV_MODE_KEY, enabled.toString());
      setIsDeveloperMode(enabled);
      console.log('🔧 Developer mode updated:', enabled);
    } catch (error) {
      console.error('Error saving developer mode state:', error);
    }
  };

  return (
    <DeveloperModeContext.Provider
      value={{
        isDeveloperMode,
        setDeveloperMode,
        isLoading,
      }}
    >
      {children}
    </DeveloperModeContext.Provider>
  );
};

export const useDeveloperMode = () => {
  const context = useContext(DeveloperModeContext);
  if (context === undefined) {
    throw new Error('useDeveloperMode must be used within a DeveloperModeProvider');
  }
  return context;
};
