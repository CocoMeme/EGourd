import { useEffect, useState } from 'react';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import * as SplashScreenExpo from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { useAuth } from '../contexts/AuthContext';
import { useDeveloperMode } from '../contexts/DeveloperModeContext';
import { initApiUrl } from '../config/api';

// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreenExpo.preventAutoHideAsync();

export const useAppResources = () => {
    // Status: 'idle' | 'checking' | 'downloading' | 'complete'
    const [updateStatus, setUpdateStatus] = useState(__DEV__ ? 'idle' : 'checking');

    const [fontsLoaded] = useFonts({
        Poppins_400Regular,
        Poppins_500Medium,
        Poppins_600SemiBold,
        Poppins_700Bold,
    });

    const { isLoading: authLoading } = useAuth();
    const { isLoading: devModeLoading } = useDeveloperMode();

    useEffect(() => {
        // Load any stored API URL override before the app makes network calls
        initApiUrl();
    }, []);

    useEffect(() => {
        // Separate update check to run only once on mount
        async function checkUpdates() {
            if (__DEV__) {
                setUpdateStatus('idle');
                return;
            }

            try {
                const update = await Updates.checkForUpdateAsync();
                if (update.isAvailable) {
                    setUpdateStatus('downloading');
                    await Updates.fetchUpdateAsync();
                    setUpdateStatus('complete');

                    // Small delay to let user see "Complete" before reload
                    setTimeout(async () => {
                        await Updates.reloadAsync();
                    }, 1000);
                } else {
                    // Start minimum delay for "Checking..." visibility
                    // But since we want to handle the "No updates" UI logic in SplashScreen,
                    // we can just set to 'idle' here, and let SplashScreen decide if it wants to show "No updates".
                    // Actually, if we set 'idle' immediately, the text might flash.
                    // Let's passed 'idle' and let SplashScreen handle the visual transition.
                    setUpdateStatus('idle');
                }
            } catch (e) {
                console.log('Update check failed:', e);
                setUpdateStatus('idle');
            }
        }
        checkUpdates();
    }, []);

    useEffect(() => {
        async function prepare() {
            // Create a combined loading state
            const isReady = fontsLoaded && !authLoading && !devModeLoading;

            if (isReady) {
                // Hide the splash screen once everything is loaded
                await SplashScreenExpo.hideAsync();
            }
        }
        prepare();
    }, [fontsLoaded, authLoading, devModeLoading]);

    // Return object with loading status and updating status
    return {
        isLoading: !fontsLoaded || authLoading || devModeLoading,
        updateStatus
    };
};
