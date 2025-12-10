import React, { useState, useEffect } from 'react';
import { NavigationContainer, useFocusEffect, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, Alert } from 'react-native';

import { HomeScreen, CameraScreen, CameraScreenTM, ResultsScreen, ResultsScreenTM, HistoryScreen, NewsScreen, ChatbotScreen, LoginScreen, SignUpScreen, ProfileScreen, PollinationScreen, PlantFormScreen, PlantDetailScreen, HowToUseScreen, EducationalScreen, CommunityScreen, CreatePostScreen, PostDetailScreen } from '../screens';
import { AdminDashboardScreen, UserManagementScreen, UserDetailScreen, ForumManagementScreen } from '../screens/AdminScreens';
import { theme } from '../styles';
import { pollinationNotificationHelper } from '../utils/pollinationNotificationHelper';

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
import { authService } from '../services';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const HomeStack = ({ route }) => {
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
        contentStyle: { backgroundColor: theme.colors.background.primary },
      }}
    >
      <Stack.Screen 
        name="HomeMain" 
        initialParams={{ 
          showWelcome: route?.params?.showWelcome,
        }}
      >
        {(props) => <HomeScreen {...props} />}
      </Stack.Screen>
      <Stack.Screen 
        name="HowToUse" 
        component={HowToUseScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Educational" 
        component={EducationalScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="NewsMain" 
        component={NewsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Chatbot" 
        component={ChatbotScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Community" 
        component={CommunityScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CreatePost" 
        component={CreatePostScreen}
        options={{ 
          headerShown: false,
          presentation: 'transparentModal',
          cardStyle: { backgroundColor: 'transparent' },
          cardOverlayEnabled: true,
          cardStyleInterpolator: ({ current: { progress } }) => ({
            cardStyle: {
              opacity: progress,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1000, 0],
                  }),
                },
              ],
            },
          }),
        }}
      />
      <Stack.Screen 
        name="PostDetail" 
        component={PostDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const CameraStack = () => {
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

const PollinationStack = () => {
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

const CommunityStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleStyle: {
          fontFamily: 'Poppins_600SemiBold',
          fontSize: 18,
        },
        headerShown: false,
        statusBarTranslucent: false,
        contentStyle: { backgroundColor: theme.colors.background.primary },
      }}
    >
      <Stack.Screen 
        name="CommunityMain" 
        component={CommunityScreen} 
        options={{ title: 'Community' }}
      />
      <Stack.Screen 
        name="CreatePost" 
        component={CreatePostScreen}
        options={{ 
          headerShown: false,
          presentation: 'transparentModal',
          cardStyle: { backgroundColor: 'transparent' },
          cardOverlayEnabled: true,
          cardStyleInterpolator: ({ current: { progress } }) => ({
            cardStyle: {
              opacity: progress,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1000, 0],
                  }),
                },
              ],
            },
          }),
        }}
      />
      <Stack.Screen 
        name="PostDetail" 
        component={PostDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const ProfileStack = ({ onAuthChange }) => {
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

// Admin Stack for admin dashboard and user management
const AdminStack = () => {
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

// Auth Stack for login/signup screens
const AuthStack = ({ onAuthSuccess }) => {
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
          tabBarActiveTintColor: '#F44336',
          tabBarInactiveTintColor: '#9e9e9e',
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
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#9e9e9e',
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Check authentication status on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const isAuth = await authService.initialize();
      setIsAuthenticated(isAuth);
      
      // Get user role if authenticated
      if (isAuth) {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          console.log('👤 User Data:', user);
          console.log('🔑 User Role:', user.role);
          setUserRole(user.role);
        }

        // Initialize pollination notifications now that user is authenticated
        console.log('🔔 User authenticated - initializing notifications...');
        try {
          await pollinationNotificationHelper.initialize();
        } catch (error) {
          console.error('Error initializing notifications after login:', error);
          // Don't fail the app if notifications fail to initialize
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setUserRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthChange = () => {
    // Force re-check authentication status and show welcome alert
    setShowWelcome(true);
    setIsLoading(true);
    checkAuthStatus();
  };

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
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