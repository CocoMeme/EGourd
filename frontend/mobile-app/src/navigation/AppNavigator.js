import React, { useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../styles';

// Import Stacks
import {
  HomeStack,
  CameraStack,
  PollinationStack,
  CommunityStack,
  ProfileStack,
  AdminStack,
  AuthStack
} from './stacks';

const TAB_BAR_HEIGHT = 70;

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background.primary,
    card: theme.colors.surface,
    border: theme.colors.background.secondary,
  },
};

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Main Tab Navigator (protected)
const MainTabs = ({ onAuthChange, showWelcome, userRole }) => {
  // Admin users see only admin dashboard and profile
  if (userRole === 'admin') {
    return (
      <Tab.Navigator
        sceneContainerStyle={{ backgroundColor: theme.colors.background.primary }}
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color }) => {
            const iconMap = {
              Admin: { active: 'shield', inactive: 'shield-outline' },
              Profile: { active: 'person', inactive: 'person-outline' },
            };

            const { active, inactive } = iconMap[route.name] || {
              active: 'ellipse',
              inactive: 'ellipse-outline',
            };

            const iconName = focused ? active : inactive;
            const iconSize = focused ? 24 : 20;
            return <Ionicons name={iconName} size={iconSize} color={color} />;
          },
          tabBarActiveTintColor: theme.colors.error, // Red for admin
          tabBarInactiveTintColor: theme.colors.text.secondary,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.background.secondary,
            height: TAB_BAR_HEIGHT,
            paddingBottom: 12,
            paddingTop: 8,
          },
          tabBarHideOnKeyboard: true,
          headerShown: false,
        })}
      >
        <Tab.Screen
          name="Admin"
          component={AdminStack}
        />
        <Tab.Screen
          name="Profile"
        >
          {(props) => <ProfileStack {...props} onAuthChange={onAuthChange} />}
        </Tab.Screen>
      </Tab.Navigator>
    );
  }

  // Regular users see all normal features
  return (
    <Tab.Navigator
      sceneContainerStyle={{ backgroundColor: theme.colors.background.primary }}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          const iconMap = {
            Home: { active: 'grid', inactive: 'grid-outline' },
            Community: { active: 'people', inactive: 'people-outline' },
            Camera: { active: 'camera', inactive: 'camera-outline' },
            Pollination: { active: 'leaf', inactive: 'leaf-outline' },
            Profile: { active: 'person', inactive: 'person-outline' },
          };

          const { active, inactive } = iconMap[route.name] || {
            active: 'ellipse',
            inactive: 'ellipse-outline',
          };

          const iconName = focused ? active : inactive;
          const iconSize = focused ? 24 : 20;
          return <Ionicons name={iconName} size={iconSize} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text.secondary,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.background.secondary,
          height: TAB_BAR_HEIGHT,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarHideOnKeyboard: true,
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        initialParams={{ showWelcome }}
      >
        {(props) => <HomeStack {...props} />}
      </Tab.Screen>
      <Tab.Screen name="Community" component={CommunityStack} />
      <Tab.Screen name="Camera" component={CameraStack} />
      <Tab.Screen name="Pollination" component={PollinationStack} />
      <Tab.Screen
        name="Profile"
      >
        {(props) => <ProfileStack {...props} onAuthChange={onAuthChange} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const { isAuthenticated, userRole, isLoading, checkAuthStatus } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);

  const handleAuthChange = () => {
    // Force re-check authentication status and show welcome alert
    setShowWelcome(true);
    checkAuthStatus();
  };

  // Show loading screen while checking auth
  // Note: Most of the time this will be handled by the Splash Screen in App.js
  // But this is a fallback for in-between states if needed
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background.secondary }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen
            name="Main"
            initialParams={{ showWelcome }}
          >
            {(props) => <MainTabs {...props} onAuthChange={handleAuthChange} showWelcome={showWelcome} userRole={userRole} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Auth">
            {(props) => <AuthStack {...props} onAuthSuccess={handleAuthChange} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
