import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { AppLogo, GlassCard, Button } from '../components';
import { NavigationProp } from '../types';
import { useSpotify } from '../context/SpotifyContext';

export const WelcomeScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const { isAuthed: spotifyConnected, isConnecting, connect: handleSpotifyConnect } = useSpotify();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Brand Section */}
                <View style={styles.brandSection}>
                    <AppLogo size="md" />

                    <Text style={styles.title}>
                        Senti<Text style={styles.titleAccent}>vibe</Text>
                    </Text>
                    <Text style={styles.subtitle}>Where Moods Meet Media</Text>
                </View>

                {/* Main App Auth */}
                <View style={styles.authButtons}>
                    <Button onPress={() => navigation.navigate('Login')}>
                        Log In
                    </Button>
                    <Button
                        variant="outline"
                        onPress={() => navigation.navigate('Signup')}
                    >
                        Create Account
                    </Button>
                </View>

                {/* Spotify Integration Section */}
                <GlassCard style={styles.spotifyCard}>
                    <View style={styles.spotifyHeader}>
                        <Icon name="music" size={18} color="#1DB954" />
                        <Text style={styles.spotifyTitle}>Music Integration</Text>
                    </View>

                    <Text style={styles.spotifyDescription}>
                        Connect Spotify to enable emotion-based song recommendations and AI-curated playlists.
                    </Text>

                    <Button
                        variant="spotify"
                        onPress={handleSpotifyConnect}
                        style={spotifyConnected ? styles.connectedButton : undefined}
                    >
                        {isConnecting ? (
                            <>
                                <ActivityIndicator size="small" color="#000" /> Connecting...
                            </>
                        ) : spotifyConnected ? (
                            <>
                                <Icon name="check" size={18} color="#000" /> Connected
                            </>
                        ) : (
                            'Connect Spotify'
                        )}
                    </Button>
                </GlassCard>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 48,
        paddingBottom: 24,
    },
    brandSection: {
        alignItems: 'center',
        marginBottom: 48,
        marginTop: 32,
    },
    title: {
        fontSize: 48,
        fontWeight: '900',
        color: '#FFFFFF',
        marginTop: 24,
        letterSpacing: -1,
    },
    titleAccent: {
        color: '#3B82F6',
    },
    subtitle: {
        fontSize: 18,
        color: '#CBD5E1',
        fontWeight: '300',
        letterSpacing: 1,
        marginTop: 4,
    },
    authButtons: {
        gap: 16,
        marginBottom: 32,
    },
    spotifyCard: {
        padding: 20,
        borderRadius: 16,
    },
    spotifyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'center',
        marginBottom: 12,
    },
    spotifyTitle: {
        color: '#FFFFFF',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    spotifyDescription: {
        fontSize: 12,
        color: '#94A3B8',
        marginBottom: 16,
        lineHeight: 18,
        fontWeight: '300',
        textAlign: 'center',
    },
    connectedButton: {
        opacity: 0.8,
    },
});
