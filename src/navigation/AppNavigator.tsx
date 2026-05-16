import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import {
    SplashScreen,
    WelcomeScreen,
    LoginScreen,
    SignupScreen,
    OnboardingScreen,
    ChatbotScreen,
    DetectionScreen,
    ResultsScreen,
    PlayerScreen,
    ProfileScreen,
    SettingsScreen,
    HistoryScreen,
    EmotionErrorScreen,
    FavoritesScreen,
} from '../screens';

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
    return (
        <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{
                headerShown: false,
                cardStyle: { backgroundColor: '#020617' },
                cardStyleInterpolator: ({ current }) => ({
                    cardStyle: {
                        opacity: current.progress,
                    },
                }),
            }}
        >
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Chatbot" component={ChatbotScreen} />
            <Stack.Screen name="Detection" component={DetectionScreen} />
            <Stack.Screen name="Results" component={ResultsScreen} />
            <Stack.Screen
                name="Player"
                component={PlayerScreen}
                options={{
                    presentation: 'modal',
                    gestureEnabled: true,
                    cardStyleInterpolator: ({ current, layouts }) => ({
                        cardStyle: {
                            transform: [
                                {
                                    translateY: current.progress.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [layouts.screen.height, 0],
                                    }),
                                },
                            ],
                        },
                    }),
                }}
            />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} />
            <Stack.Screen name="EmotionError" component={EmotionErrorScreen} />
        </Stack.Navigator>
    );
};
