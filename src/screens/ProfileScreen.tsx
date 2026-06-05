import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { GlassCard, Button } from '../components';
import { NavigationProp } from '../types';
import { AuthContext } from '../context/AuthContext';
import { useSpotify } from '../context/SpotifyContext';
import { ICON_STYLE } from '../constants';

export const ProfileScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const { user, logOut } = useContext(AuthContext);
    const { isAuthed, isConnecting, connect } = useSpotify();

    const handleLogout = async () => {
        try {
            await logOut();
            navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
            });
        } catch (error) {
            console.warn('Logout failed:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.navigate('Chatbot')}
                >
                    <Icon name="arrow-left" size={24} color="#94A3B8" style={ICON_STYLE} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Profile</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Avatar */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {user?.name ? user.name[0].toUpperCase() : 'U'}
                        </Text>
                    </View>
                    <Text style={styles.userName}>{user?.name || 'User'}</Text>
                    <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
                </View>

                {/* Spotify Card */}
                <GlassCard style={styles.spotifyCard}>
                    <View style={styles.spotifyIcon}>
                        <Icon name="music" size={24} color="#1DB954" style={ICON_STYLE} />
                    </View>
                    <View style={styles.spotifyInfo}>
                        <Text style={styles.spotifyTitle}>
                            {isAuthed ? 'Spotify Connected' : 'Spotify Not Connected'}
                        </Text>
                        <Text style={styles.spotifySubtitle}>
                            {isAuthed
                                ? 'Personalized music & playback enabled'
                                : 'Connect in Settings for personalized picks'}
                        </Text>
                    </View>
                    {isAuthed ? (
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>ACTIVE</Text>
                        </View>
                    ) : (
                        <Button variant="spotify" onPress={connect} style={styles.connectButton}>
                            {isConnecting ? (
                                <ActivityIndicator size="small" color="#000" />
                            ) : (
                                'Connect'
                            )}
                        </Button>
                    )}
                </GlassCard>

                {/* Action Buttons */}
                <View style={styles.actions}>
                    <Button
                        variant="secondary"
                        onPress={() => navigation.navigate('Onboarding', { isUpdate: true })}
                    >
                        Edit Preferences
                    </Button>
                    <Button
                        variant="outline"
                        onPress={() => navigation.navigate('Settings')}
                    >
                        <Icon name="settings" size={18} color="#60A5FA" /> App Settings
                    </Button>
                    <Button
                        variant="outline"
                        onPress={handleLogout}
                    >
                        <Icon name="log-out" size={18} color="#F87171" /> Log Out
                    </Button>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    placeholder: {
        width: 44,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 24,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 4,
        borderColor: '#0F172A',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#94A3B8',
    },
    spotifyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        gap: 16,
    },
    spotifyIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(29, 185, 84, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    spotifyInfo: {
        flex: 1,
    },
    spotifyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    spotifySubtitle: {
        fontSize: 12,
        color: '#94A3B8',
    },
    statusBadge: {
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#4ADE80',
    },
    connectButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        minHeight: 36,
    },
    actions: {
        gap: 12,
    },
});
