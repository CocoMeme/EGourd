import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen, SignUpScreen } from '../../screens';

const Stack = createStackNavigator();

export const AuthStack = ({ onAuthSuccess }) => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login">
                {(props) => <LoginScreen {...props} onAuthSuccess={onAuthSuccess} />}
            </Stack.Screen>
            <Stack.Screen name="SignUp">
                {(props) => <SignUpScreen {...props} onAuthSuccess={onAuthSuccess} />}
            </Stack.Screen>
        </Stack.Navigator>
    );
};
