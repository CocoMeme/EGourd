import { useEffect } from 'react';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import * as SplashScreenExpo from 'expo-splash-screen';
import { useAuth } from '../contexts/AuthContext';
import { useDeveloperMode } from '../contexts/DeveloperModeContext';

// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreenExpo.preventAutoHideAsync();

export const useAppResources = () => {
    const [fontsLoaded] = useFonts({
        Poppins_400Regular,
        Poppins_500Medium,
        Poppins_600SemiBold,
        Poppins_700Bold,
    });

    const { isLoading: authLoading } = useAuth();
    const { isLoading: devModeLoading } = useDeveloperMode();

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

    // Return generic loading state
    return !fontsLoaded || authLoading || devModeLoading;
};
