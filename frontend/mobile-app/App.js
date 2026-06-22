import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator, DeveloperNavigator } from './src/navigation';
import { SplashScreen } from './src/components';
import ErrorBoundary from './src/components/ErrorBoundary';
import { DeveloperModeProvider, useDeveloperMode } from './src/contexts/DeveloperModeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { useAppResources } from './src/hooks/useAppResources';
import { initI18n } from './src/i18n/i18n';

// Inner component that uses the DeveloperMode context
const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);
  const { isDeveloperMode } = useDeveloperMode();
  const { isLoading, updateStatus } = useAppResources();
  const isUpdating = updateStatus === 'downloading' || updateStatus === 'complete' || updateStatus === 'checking';

  const handleSplashFinish = () => {
    // Only hide custom splash if we are not updating
    if (!isUpdating) {
      console.log('Splash screen finished, showing main app');
      setShowSplash(false);
    }
  };

  // Wait for resources to load before rendering the app content
  // The native Splash Screen is handled by the hook
  if ((isLoading || isUpdating) && showSplash) {
    // Show our custom JS splash screen while loading
    return (
      <SplashScreen 
        onFinish={isUpdating ? undefined : () => {}} // No finish callback while updating
        updateStatus={updateStatus}
      />
    );
  }

  return (
    <>
      {isDeveloperMode ? <DeveloperNavigator /> : <AppNavigator />}
      <StatusBar style="auto" backgroundColor="transparent" translucent />
      {showSplash && (
        <SplashScreen 
          onFinish={handleSplashFinish} 
          updateStatus={updateStatus}
        />
      )}
    </>
  );
};

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n.then(() => setI18nReady(true));
  }, []);

  if (!i18nReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <AuthProvider>
            <LanguageProvider>
              <DeveloperModeProvider>
                <AppContent />
              </DeveloperModeProvider>
            </LanguageProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
