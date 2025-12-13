import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import {
    CommunityScreen,
    CreatePostScreen,
    PostDetailScreen
} from '../../screens';
import { theme } from '../../styles';

const Stack = createStackNavigator();

export const CommunityStack = () => {
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
