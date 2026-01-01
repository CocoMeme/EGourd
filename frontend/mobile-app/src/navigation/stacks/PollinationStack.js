import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import {
    PollinationScreen,
    PlantFormScreen,
    PlantDetailScreen,
    PredictFlowersScreen,
    PredictionResultsScreen,
    PredictYieldScreen,
    YieldResultsScreen
} from '../../screens';

const Stack = createStackNavigator();

export const PollinationStack = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerTitleStyle: {
                    fontFamily: 'Poppins_600SemiBold',
                    fontSize: 18,
                },
                headerShown: false,
            }}
        >
            <Stack.Screen
                name="PollinationMain"
                component={PollinationScreen}
                options={{ title: 'Pollination Management' }}
            />
            <Stack.Screen
                name="PlantForm"
                component={PlantFormScreen}
                options={{
                    title: 'Plant Form',
                    headerShown: true,
                    presentation: 'modal'
                }}
            />
            <Stack.Screen
                name="PlantDetail"
                component={PlantDetailScreen}
                options={{
                    title: 'Plant Details',
                    headerShown: false
                }}
            />
            <Stack.Screen
                name="PredictFlowers"
                component={PredictFlowersScreen}
                options={{
                    title: 'Predict Flower Production',
                    headerShown: true,
                    presentation: 'modal'
                }}
            />
            <Stack.Screen
                name="PredictionResults"
                component={PredictionResultsScreen}
                options={{
                    title: 'Prediction Results',
                    headerShown: true
                }}
            />
            <Stack.Screen
                name="PredictYield"
                component={PredictYieldScreen}
                options={{
                    title: 'Predict Crop Yield',
                    headerShown: false
                }}
            />
            <Stack.Screen
                name="YieldResults"
                component={YieldResultsScreen}
                options={{
                    title: 'Yield Prediction Results',
                    headerShown: false
                }}
            />
        </Stack.Navigator>
    );
};
