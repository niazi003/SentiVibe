import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { GlassCard, Button } from '../components';
import { HelpSupportModal } from '../components/HelpSupportModal';
import { NavigationProp } from '../types';
import { AppContext } from '../context/AppContext';
import { useSpotify } from '../context/SpotifyContext';
import { ICON_STYLE } from '../constants';

export const SettingsScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const { resetChat } = useContext(AppContext);
    const { isAuthed, isConnecting, connect, disconnect } = useSpotify();
    const [helpVisible, setHelpVisible] = useState(false);

    const handleLogout = () => {
        resetChat();
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
            })
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-left" size={24} color="#94A3B8" style={ICON_STYLE} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.content}>
                <GlassCard style={styles.spotifyCard}>
                    <View style={styles.spotifyHeader}>
                        <Icon name="music" size={20} color="#1DB954" style={ICON_STYLE} />
                        <Text style={styles.spotifyTitle}>Spotify</Text>
                    </View>
                    <Text style={styles.spotifyDescription}>
                        {isAuthed
                            ? 'Connected — your saved preferences sync automatically for personalized music.'
                            : 'Connect Spotify to personalize music recommendations and enable playback control.'}
                    </Text>
                    <Button
                        variant={isAuthed ? 'outline' : 'spotify'}
                        onPress={isAuthed ? disconnect : connect}
                        style={styles.spotifyButton}
                    >
                        {isConnecting ? (
                            <>
                                <ActivityIndicator size="small" color={isAuthed ? '#1DB954' : '#000'} />
                                {' '}Connecting...
                            </>
                        ) : isAuthed ? (
                            <>
                                <Icon name="check" size={18} color="#1DB954" /> Connected — Tap to Disconnect
                            </>
                        ) : (
                            'Connect Spotify'
                        )}
                    </Button>
                </GlassCard>

                <GlassCard style={styles.settingsCard}>
                    <TouchableOpacity
                        style={styles.settingsItem}
                        onPress={() => setHelpVisible(true)}
                    >
                        <View style={styles.settingsLeft}>
                            <Icon name="help-circle" size={20} color="#60A5FA" style={ICON_STYLE} />
                            <Text style={styles.settingsText}>Help & Support</Text>
                        </View>
                        <Icon name="chevron-right" size={16} color="#64748B" />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity
                        style={styles.settingsItem}
                        onPress={() => navigation.navigate('Onboarding', { isUpdate: true })}
                    >
                        <View style={styles.settingsLeft}>
                            <Icon name="sliders" size={20} color="#A78BFA" style={ICON_STYLE} />
                            <Text style={styles.settingsText}>Personalization Settings</Text>
                        </View>
                        <Icon name="chevron-right" size={16} color="#64748B" />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <View style={[styles.settingsItem, styles.versionItem]}>
                        <Text style={styles.versionLabel}>App Version</Text>
                        <Text style={styles.versionValue}>v1.0.4 (Beta)</Text>
                    </View>
                </GlassCard>

                <Button
                    variant="danger"
                    onPress={handleLogout}
                    style={styles.logoutButton}
                >
                    <Icon name="log-out" size={18} color="#EF4444" /> Log Out
                </Button>
            </View>

            <HelpSupportModal
                visible={helpVisible}
                onClose={() => setHelpVisible(false)}
            />
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
    content: {
        padding: 24,
    },
    spotifyCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    spotifyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    spotifyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    spotifyDescription: {
        fontSize: 13,
        color: '#94A3B8',
        lineHeight: 18,
        marginBottom: 12,
    },
    spotifyButton: {
        marginTop: 4,
    },
    settingsCard: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 32,
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    settingsLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingsText: {
        fontSize: 16,
        color: '#CBD5E1',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    versionItem: {
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    versionLabel: {
        fontSize: 14,
        color: '#64748B',
    },
    versionValue: {
        fontSize: 14,
        color: '#94A3B8',
        fontFamily: 'monospace',
    },
    logoutButton: {
        marginTop: 16,
    },
});
