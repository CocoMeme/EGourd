import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import {
    CameraScreen,
    CameraScreenTM,
    ResultsScreen,
    ResultsScreenTM
} from '../../screens';

const Stack = createStackNavigator();

export const CameraStack = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerTitleStyle: {
                    fontFamily: 'Poppins_600SemiBold',
                    fontSize: 18,
                },
            }}
        >
            <Stack.Screen
                name="CameraMain"
                component={CameraScreen}
                options={{ title: 'Scan Gourd' }}
            />
            <Stack.Screen
                name="CameraScreenTM"
                component={CameraScreenTM}
                options={{
                    title: 'TM Test Mode',
                    headerShown: false
                }}
            />
            <Stack.Screen
                name="Results"
                component={ResultsScreen}
                options={{ title: 'Scan Results' }}
            />
            <Stack.Screen
                name="ResultsTM"
                component={ResultsScreenTM}
                options={{ title: 'TM Analysis Results', headerShown: false }}
            />
        </Stack.Navigator>
    );
};
