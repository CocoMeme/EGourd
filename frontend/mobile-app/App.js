import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import * as SplashScreenExpo from 'expo-splash-screen';
import { AppNavigator, DeveloperNavigator } from './src/navigation';
import { SplashScreen } from './src/components';
import { DeveloperModeProvider, useDeveloperMode } from './src/contexts/DeveloperModeContext';

// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreenExpo.preventAutoHideAsync();

// Inner component that uses the DeveloperMode context
const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);
  const { isDeveloperMode, isLoading: devModeLoading } = useDeveloperMode();

  const handleSplashFinish = () => {
    console.log('Splash screen finished, showing main app');
    setShowSplash(false);
  };

  // Show loading while developer mode state is being loaded
  if (devModeLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
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
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    async function prepare() {
      if (fontsLoaded) {
        // Hide the splash screen once fonts are loaded
        // Notification initialization will happen after user login in AppNavigator
        await SplashScreenExpo.hideAsync();
      }
    }
    prepare();
  }, [fontsLoaded]);

  // Don't render the app until fonts are loaded
  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <DeveloperModeProvider>
          <AppContent />
        </DeveloperModeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
