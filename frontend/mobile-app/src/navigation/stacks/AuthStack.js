import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen } from '../../screens/AccountScreens/LoginScreen';
import { SignUpScreen } from '../../screens/AccountScreens/SignUpScreen';
import { VerifyScreen } from '../../screens/AccountScreens/VerifyScreen';

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
            <Stack.Screen name="VerifyEmail" component={VerifyScreen} />
        </Stack.Navigator>
    );
};

