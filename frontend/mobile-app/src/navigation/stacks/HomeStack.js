import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import {
    HomeScreen,
    HowToUseScreen,
    EducationalScreen,
    NewsScreen,
    ChatbotScreen,
    CommunityScreen,
    CreatePostScreen,
    PostDetailScreen
} from '../../screens';
import { theme } from '../../styles';

const Stack = createStackNavigator();

export const HomeStack = ({ route }) => {
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
            {/* Community screens accessible from Home mainly for viewing specific content from feeds on home if any */}
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
