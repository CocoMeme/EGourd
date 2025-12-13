import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import {
    PollinationScreen,
    PlantFormScreen,
    PlantDetailScreen
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
        </Stack.Navigator>
    );
};
