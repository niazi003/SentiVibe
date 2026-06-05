import React, { useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { GlassCard, Button, PasswordInput } from '../components';
import { NavigationProp } from '../types';
import { ICON_STYLE } from '../constants';
import { AuthContext } from '../context/AuthContext';
import { getPreferencesFromFirestore as getUserPreferences } from '../services/firestorePreferences';

export const LoginScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const { logIn } = useContext(AuthContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        // Basic validation
        if (!email.trim()) {
            setError('Please enter your email.');
            return;
        }
        if (!password.trim()) {
            setError('Please enter your password.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            await logIn(email.trim().toLowerCase(), password);

            // Check if onboarding is complete
            try {
                const prefs = await getUserPreferences();
                if (prefs.onboardingComplete) {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Chatbot' }],
                    });
                } else {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Onboarding' }],
                    });
                }
            } catch {
                // If we can't check, just go to chatbot
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Chatbot' }],
                });
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <KeyboardAwareScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                enableOnAndroid={true}
                extraScrollHeight={20}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-left" size={24} color="#94A3B8" style={ICON_STYLE} />
                </TouchableOpacity>

                <View style={styles.header}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to continue your journey.</Text>
                </View>

                <GlassCard style={styles.form}>
                    {error ? (
                        <View style={styles.errorBox}>
                            <Icon name="alert-circle" size={16} color="#F87171" style={ICON_STYLE} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Enter your email"
                            placeholderTextColor="#475569"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <PasswordInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Enter your password"
                            editable={!loading}
                        />
                    </View>

                    <Button
                        onPress={handleLogin}
                        style={styles.submitButton}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            'Log In'
                        )}
                    </Button>
                </GlassCard>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account?</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                        <Text style={styles.footerLink}>Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
        paddingHorizontal: 24,
        paddingTop: 48,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    header: {
        marginBottom: 40,
    },
    title: {
        fontSize: 36,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 18,
        color: '#94A3B8',
        fontWeight: '300',
    },
    form: {
        padding: 24,
        borderRadius: 24,
        gap: 24,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(248, 113, 113, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(248, 113, 113, 0.3)',
        borderRadius: 12,
        padding: 12,
    },
    errorText: {
        flex: 1,
        fontSize: 13,
        color: '#F87171',
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: '#CBD5E1',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: 4,
    },
    input: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#FFFFFF',
    },
    submitButton: {
        marginTop: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 32,
    },
    footerText: {
        fontSize: 14,
        color: '#94A3B8',
    },
    footerLink: {
        fontSize: 14,
        fontWeight: '700',
        color: '#60A5FA',
    },
});
