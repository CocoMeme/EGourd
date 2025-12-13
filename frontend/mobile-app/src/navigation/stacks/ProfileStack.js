import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ProfileScreen } from '../../screens';
import { theme } from '../../styles';

const Stack = createStackNavigator();

export const ProfileStack = ({ onAuthChange }) => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerTitleStyle: {
                    fontFamily: 'Poppins_600SemiBold',
                    fontSize: 18,
                },
                headerShown: false,
                statusBarTranslucent: true,
                statusBarStyle: 'light',
                statusBarColor: 'transparent',
                contentStyle: { backgroundColor: theme.colors.background.secondary },
            }}
        >
            <Stack.Screen
                name="ProfileMain"
                options={{ title: 'Profile' }}
            >
                {(props) => <ProfileScreen {...props} onAuthChange={onAuthChange} />}
            </Stack.Screen>
        </Stack.Navigator>
    );
};
