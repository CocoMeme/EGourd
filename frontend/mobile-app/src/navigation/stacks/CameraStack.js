import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import {
    CameraScreen,
    FlowerPredictionScreen,
    LeafPredictionScreen,
    FlowerResultsScreen,
    LeafResultsScreen,
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
                name="FlowerPrediction"
                component={FlowerPredictionScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="LeafPrediction"
                component={LeafPredictionScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="FlowerResults"
                component={FlowerResultsScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="LeafResults"
                component={LeafResultsScreen}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
    );
};
