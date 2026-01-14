import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import {
    CameraScreen,
    ResultsScreen,
    PredictionScreen
} from '../../screens';

const Stack = createStackNavigator();

export const CameraStack = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false, // Custom headers are used in each screen
                headerTitleStyle: {
                    fontFamily: 'Poppins_600SemiBold',
                    fontSize: 18,
                },
            }}
        >
            <Stack.Screen
                name="CameraMain"
                component={CameraScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Prediction"
                component={PredictionScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Results"
                component={ResultsScreen}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
    );
};
