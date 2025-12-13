import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import {
    AdminDashboardScreen,
    UserManagementScreen,
    UserDetailScreen,
    ForumManagementScreen
} from '../../screens/AdminScreens';
import { theme } from '../../styles';

const Stack = createStackNavigator();

export const AdminStack = () => {
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
                name="AdminDashboardMain"
                component={AdminDashboardScreen}
                options={{ title: 'Admin Dashboard' }}
            />
            <Stack.Screen
                name="UserManagement"
                component={UserManagementScreen}
                options={{ title: 'User Management' }}
            />
            <Stack.Screen
                name="UserDetail"
                component={UserDetailScreen}
                options={{ title: 'User Details' }}
            />
            <Stack.Screen
                name="ForumManagement"
                component={ForumManagementScreen}
                options={{ title: 'Forum Management' }}
            />
        </Stack.Navigator>
    );
};
