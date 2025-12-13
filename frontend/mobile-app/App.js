import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator, DeveloperNavigator } from './src/navigation';
import { SplashScreen } from './src/components';
import { DeveloperModeProvider, useDeveloperMode } from './src/contexts/DeveloperModeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { useAppResources } from './src/hooks/useAppResources';

// Inner component that uses the DeveloperMode context
const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);
  const { isDeveloperMode } = useDeveloperMode();
  const isLoading = useAppResources();

  const handleSplashFinish = () => {
    console.log('Splash screen finished, showing main app');
    setShowSplash(false);
  };

  // Wait for resources to load before rendering the app content
  // The native Splash Screen is handled by the hook
  if (isLoading && showSplash) {
    // Show our custom JS splash screen while loading
    // OR we can just return null and let the native splash screen persist
    // But since we have a custom animated splash screen component, we want to render it
    return (
      <SplashScreen onFinish={() => { }} />
    );
  }

  return (
    <>
      {isDeveloperMode ? <DeveloperNavigator /> : <AppNavigator />}
      <StatusBar style="auto" backgroundColor="transparent" translucent />
      {showSplash && (
        <SplashScreen onFinish={handleSplashFinish} />
      )}
    </>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <AuthProvider>
          <DeveloperModeProvider>
            <AppContent />
          </DeveloperModeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
