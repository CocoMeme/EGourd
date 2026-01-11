import { useEffect, useState } from 'react';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import * as SplashScreenExpo from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { useAuth } from '../contexts/AuthContext';
import { useDeveloperMode } from '../contexts/DeveloperModeContext';

// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreenExpo.preventAutoHideAsync();

export const useAppResources = () => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [fontsLoaded] = useFonts({
        Poppins_400Regular,
        Poppins_500Medium,
        Poppins_600SemiBold,
        Poppins_700Bold,
    });

    const { isLoading: authLoading } = useAuth();
    const { isLoading: devModeLoading } = useDeveloperMode();

    useEffect(() => {
        // Separate update check to run only once on mount
        async function checkUpdates() {
            if (__DEV__) return;
            try {
                const update = await Updates.checkForUpdateAsync();
                if (update.isAvailable) {
                    setIsUpdating(true);
                    await Updates.fetchUpdateAsync();
                    await Updates.reloadAsync();
                }
            } catch (e) {
                console.log('Update check failed:', e);
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
        isUpdating
    };
};
