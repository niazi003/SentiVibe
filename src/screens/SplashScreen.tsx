import React, { useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { NavigationProp } from '../types';
import { AuthContext } from '../context/AuthContext';
import { getPreferencesFromFirestore as getUserPreferences } from '../services/firestorePreferences';

export const SplashScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const { user, loading } = useContext(AuthContext);

    // Animation values
    const logoScale = useRef(new Animated.Value(0.5)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const glowScale = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        // Animate logo entrance
        Animated.parallel([
            Animated.spring(logoScale, {
                toValue: 1,
                friction: 4,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(glowScale, {
                toValue: 1.2,
                duration: 1500,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();

        // Animate text after logo
        setTimeout(() => {
            Animated.timing(textOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();
        }, 400);
    }, []);

    // Navigate after auth state is resolved
    useEffect(() => {
        if (loading) return; // Wait for Firebase to resolve auth state

        const timer = setTimeout(async () => {
            if (user) {
                // User is logged in — check onboarding
                try {
                    const prefs = await getUserPreferences();
                    if (prefs.onboardingComplete) {
                        navigation.reset({ index: 0, routes: [{ name: 'Chatbot' }] });
                    } else {
                        navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
                    }
                } catch {
                    navigation.reset({ index: 0, routes: [{ name: 'Chatbot' }] });
                }
            } else {
                // Not logged in — go to Welcome
                navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [loading, user, navigation]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.content}>
                {/* Logo Section */}
                <View style={styles.logoSection}>
                    <Animated.View
                        style={[
                            styles.logoContainer,
                            {
                                transform: [{ scale: logoScale }],
                                opacity: logoOpacity,
                            },
                        ]}
                    >
                        {/* Animated Glow */}
                        <Animated.View
                            style={[
                                styles.logoGlow,
                                { transform: [{ scale: glowScale }] },
                            ]}
                        />
                        <LinearGradient
                            colors={['#0F172A', '#1E293B']}
                            style={styles.logo}
                        >
                            <Text style={styles.logoText}>S</Text>
                        </LinearGradient>
                    </Animated.View>

                    <Animated.View style={{ opacity: textOpacity }}>
                        <Text style={styles.title}>
                            Senti<Text style={styles.titleAccent}>vibe</Text>
                        </Text>
                        <Text style={styles.subtitle}>Where Moods Meet Media</Text>
                    </Animated.View>
                </View>

                {/* Loading indicator */}
                <Animated.View style={[styles.loadingContainer, { opacity: textOpacity }]}>
                    <View style={styles.loadingDots}>
                        <LoadingDot delay={0} />
                        <LoadingDot delay={200} />
                        <LoadingDot delay={400} />
                    </View>
                </Animated.View>
            </View>
        </SafeAreaView>
    );
};

// Animated loading dot component
const LoadingDot: React.FC<{ delay: number }> = ({ delay }) => {
    const animValue = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animate = () => {
            Animated.sequence([
                Animated.timing(animValue, {
                    toValue: 1,
                    duration: 400,
                    delay,
                    useNativeDriver: true,
                }),
                Animated.timing(animValue, {
                    toValue: 0.3,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]).start(() => animate());
        };
        animate();
    }, []);

    return (
        <Animated.View
            style={[
                styles.dot,
                { opacity: animValue },
            ]}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    logoSection: {
        alignItems: 'center',
    },
    logoContainer: {
        width: 160,
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    logoGlow: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: '#2563EB',
        opacity: 0.25,
    },
    logo: {
        width: 128,
        height: 128,
        borderRadius: 64,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        elevation: 15,
    },
    logoText: {
        fontSize: 56,
        fontWeight: '900',
        color: '#60A5FA',
    },
    title: {
        fontSize: 42,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -1,
        textAlign: 'center',
    },
    titleAccent: {
        color: '#3B82F6',
    },
    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
        fontWeight: '300',
        letterSpacing: 1,
        marginTop: 8,
        textAlign: 'center',
    },
    loadingContainer: {
        position: 'absolute',
        bottom: 80,
    },
    loadingDots: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3B82F6',
    },
});
