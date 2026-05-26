/**
 * ResultsScreen — Mood-based recommendations
 * 
 * REFACTORED: Now fetches real data from the backend API,
 * with loading skeletons and fallback to hardcoded data.
 * Connects to PlayerContext for global playback control.
 */

import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { GlassCard, YouTubePlayer, extractYouTubeId, TrackListSkeleton } from '../components';
import { NavigationProp, RootStackParamList, MediaItem } from '../types';
import { FALLBACK_RECOMMENDATIONS, ICON_STYLE } from '../constants';
import { AppContext } from '../context/AppContext';
import { usePlayer } from '../context/PlayerContext';
import { fetchRecommendations, fetchMovieRecommendations } from '../services/api';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ResultsRouteProp = RouteProp<RootStackParamList, 'Results'>;

export const ResultsScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<ResultsRouteProp>();
    const { emotion, initialTab } = route.params;
    const { toggleFavorite, isFavorite } = useContext(AppContext);
    const { playTrack } = usePlayer();

    const [activeTab] = useState(initialTab);
    const [expandedTrailerId, setExpandedTrailerId] = useState<number | null>(null);

    // API state
    const [tracks, setTracks] = useState<MediaItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState(false);

    /**
     * Fetch recommendations from backend API.
     * Falls back to hardcoded data if API is unreachable.
     */
    const loadRecommendations = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        if (activeTab === 'Movie') {
            try {
                const response = await fetchMovieRecommendations(emotion, 3);
                if (response.data && response.data.length > 0) {
                    const mapped: MediaItem[] = response.data.map((movie) => ({
                        id: movie.id,
                        title: movie.title,
                        artist: movie.artist,
                        duration: movie.duration,
                        cover: movie.cover,
                        description: movie.description,
                        trailer: movie.trailer || movie.videoUrl || undefined,
                        videoUrl: movie.videoUrl || movie.trailer || undefined,
                        videoId: movie.videoId,
                        type: 'Movie',
                    }));
                    setTracks(mapped);
                    setIsOffline(!!response.error);
                    if (response.error) setError(response.error);
                } else {
                    useFallbackData();
                }
            } catch (err) {
                console.error('[Results] Movie fetch failed:', err);
                useFallbackData();
            } finally {
                setIsLoading(false);
            }
            return;
        }

        try {
            const response = await fetchRecommendations(emotion, 10);

            if (response.data && response.data.length > 0) {
                // Map API response to MediaItem format
                const mapped: MediaItem[] = response.data.map((track) => ({
                    id: track.id,
                    title: track.title,
                    artist: track.artist,
                    duration: track.duration,
                    cover: track.cover || track.albumArt,
                    videoId: track.videoId,
                    videoUrl: track.videoUrl || undefined,
                    spotifyId: track.spotifyId,
                    albumArt: track.albumArt,
                    durationMs: track.durationMs,
                    type: activeTab,
                }));

                setTracks(mapped);
                setIsOffline(!!response.error); // Show offline badge if using cached data

                if (response.error) {
                    setError(response.error);
                }
            } else {
                // Fall back to hardcoded data
                console.warn('[Results] API returned no data, using fallback');
                useFallbackData();
            }
        } catch (err: any) {
            console.error('[Results] Fetch failed:', err);
            useFallbackData();
        } finally {
            setIsLoading(false);
        }
    }, [emotion, activeTab]);

    const useFallbackData = () => {
        const fallback = FALLBACK_RECOMMENDATIONS[emotion] || FALLBACK_RECOMMENDATIONS['Happy'];
        const items =
            activeTab === 'Movie'
                ? fallback.Movie
                : activeTab === 'Music'
                  ? fallback.Music
                  : fallback.Video;
        setTracks(items as MediaItem[]);
        setIsOffline(true);
        setError('Using offline mode');
    };

    // Fetch data on mount and when emotion/tab changes
    useEffect(() => {
        loadRecommendations();
    }, [loadRecommendations]);

    const toggleTrailer = (itemId: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedTrailerId(expandedTrailerId === itemId ? null : itemId);
    };

    /**
     * Play a track — dispatches to global PlayerContext
     * and navigates to the PlayerScreen.
     */
    const handlePlay = (item: MediaItem) => {
        const list = tracks;
        const index = list.findIndex(i => i.id === item.id);
        const nextItems = list.slice(index + 1).map(i => ({ ...i, type: activeTab }));
        const currentItem = { ...item, type: activeTab };

        // Set global player state BEFORE navigating
        playTrack(currentItem, nextItems);

        navigation.navigate('Player', {
            item: currentItem,
            queue: nextItems,
            type: activeTab,
        });
    };

    const handleMoodChanged = () => {
        navigation.navigate('Chatbot', { reset: true });
    };

    const handleMoodNotChanged = () => {
        navigation.navigate('Chatbot', { detectedEmotion: emotion, backToChoices: true });
    };

    const getTabIcon = () => {
        switch (activeTab) {
            case 'Music':
                return <Icon name="music" size={28} color="#1DB954" />;
            case 'Video':
                return <Icon name="video" size={28} color="#EF4444" />;
            case 'Movie':
                return <Icon name="film" size={28} color="#A855F7" />;
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.navigate('Chatbot', { detectedEmotion: emotion, backToChoices: true })}
                >
                    <Icon name="arrow-left" size={18} color="#94A3B8" style={ICON_STYLE} />
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>

                <View style={styles.moodSection}>
                    <Text style={styles.moodLabel}>Detected Mood</Text>
                    <Text style={styles.moodText}>{emotion}</Text>
                </View>

                <View style={styles.tabIcon}>
                    {getTabIcon()}
                </View>

                <TouchableOpacity
                    style={styles.favoritesBtn}
                    onPress={() => navigation.navigate('Favorites')}
                >
                    <Icon name="heart" size={18} color="#FFFFFF" style={ICON_STYLE} />
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* Status indicator */}
                <View style={styles.statusRow}>
                    <Text style={styles.description}>
                        Showing <Text style={styles.descriptionBold}>{activeTab}</Text> recommendations
                    </Text>
                    {isOffline && (
                        <View style={styles.offlineBadge}>
                            <Icon name="wifi-off" size={12} color="#F59E0B" />
                            <Text style={styles.offlineText}>Offline</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Content: Loading / Error / Track list */}
            {isLoading ? (
                <TrackListSkeleton count={6} />
            ) : error && tracks.length === 0 ? (
                <View style={styles.errorContainer}>
                    <Icon name="alert-circle" size={48} color="#EF4444" />
                    <Text style={styles.errorTitle}>Couldn't load recommendations</Text>
                    <Text style={styles.errorMessage}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={loadRecommendations}>
                        <Icon name="refresh-cw" size={18} color="#FFFFFF" />
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {tracks.map((item) => (
                        <GlassCard key={item.id} style={styles.itemCard}>
                            {activeTab === 'Movie' ? (
                                /* Movie Card Layout */
                                <View style={styles.movieCard}>
                                    <View style={styles.movieHeader}>
                                        <Image
                                            source={{ uri: item.cover }}
                                            style={styles.moviePoster}
                                        />
                                        <View style={styles.movieInfo}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <Text style={[styles.movieTitle, { flex: 1 }]} numberOfLines={2}>{item.title}</Text>
                                                <TouchableOpacity
                                                    style={styles.movieFavBtn}
                                                    onPress={() => toggleFavorite({ ...item, type: activeTab })}
                                                >
                                                    <Icon
                                                        name="heart"
                                                        size={20}
                                                        color={isFavorite(item.id) ? "#EF4444" : "#FFFFFF"}
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                            <View style={styles.movieMeta}>
                                                <View style={styles.genreBadge}>
                                                    <Text style={styles.genreText}>{item.artist}</Text>
                                                </View>
                                                <Text style={styles.movieDuration}>{item.duration}</Text>
                                            </View>
                                            {item.description && (
                                                <Text style={styles.movieSynopsis} numberOfLines={expandedTrailerId === item.id ? undefined : 3}>
                                                    {item.description}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    {/* Trailer Section */}
                                    {item.trailer && (
                                        <View style={styles.trailerSection}>
                                            {expandedTrailerId === item.id ? (
                                                <>
                                                    <View style={styles.trailerContainer}>
                                                        <YouTubePlayer
                                                            videoId={extractYouTubeId(item.trailer) || ''}
                                                            height={200}
                                                            autoplay={true}
                                                        />
                                                    </View>
                                                    <TouchableOpacity
                                                        style={styles.closeTrailerBtn}
                                                        onPress={() => toggleTrailer(item.id)}
                                                    >
                                                        <Icon name="x" size={16} color="#94A3B8" style={ICON_STYLE} />
                                                        <Text style={styles.closeTrailerText}>Close Trailer</Text>
                                                    </TouchableOpacity>
                                                </>
                                            ) : (
                                                <TouchableOpacity
                                                    style={styles.watchTrailerBtn}
                                                    onPress={() => toggleTrailer(item.id)}
                                                >
                                                    <View style={styles.trailerPlayIcon}>
                                                        <Icon name="play" size={16} color="#FFFFFF" style={ICON_STYLE} />
                                                    </View>
                                                    <Text style={styles.watchTrailerText}>Watch Trailer</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                </View>
                            ) : (
                                /* Music/Video Card Layout */
                                <TouchableOpacity
                                    style={styles.itemContent}
                                    onPress={() => handlePlay(item)}
                                >
                                    <View style={styles.itemTop}>
                                        <Image
                                            source={{ uri: item.cover }}
                                            style={styles.itemCover}
                                        />
                                        <View style={styles.itemInfo}>
                                            <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                                            <Text style={styles.itemArtist}>{item.artist}</Text>
                                        </View>
                                        <View style={styles.playButton}>
                                            <Text style={styles.playIcon}>▶</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.favBtn}
                                            onPress={() => toggleFavorite({ ...item, type: activeTab })}
                                        >
                                            <Icon
                                                name="heart"
                                                size={20}
                                                color={isFavorite(item.id) ? "#EF4444" : "#FFFFFF"}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </GlassCard>
                    ))}
                </ScrollView>
            )}

            {/* Bottom Actions */}
            <GlassCard style={styles.bottomActions}>
                <TouchableOpacity
                    style={styles.changeMoodBtn}
                    onPress={handleMoodChanged}
                >
                    <Icon name="rotate-ccw" size={22} color="#94A3B8" />
                    <Text style={styles.changeMoodText}>Change Mood</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.exploreBtn}
                    onPress={handleMoodNotChanged}
                >
                    <LinearGradient
                        colors={['#2563EB', '#4F46E5']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.exploreBtnGradient}
                    >
                        <Icon name="grid" size={20} color="#FFFFFF" />
                        <Text style={styles.exploreBtnText}>Explore More</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </GlassCard>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
    },
    header: {
        padding: 32,
        paddingBottom: 16,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginBottom: 24,
    },
    backText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#94A3B8',
    },
    moodSection: {
        marginBottom: 16,
    },
    moodLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.6)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    moodText: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    tabIcon: {
        position: 'absolute',
        top: 80,
        right: 32,
        padding: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginVertical: 8,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
    },
    description: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '300',
    },
    descriptionBold: {
        fontWeight: '700',
        color: '#FFFFFF',
    },
    offlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    offlineText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#F59E0B',
    },
    // Error state
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        gap: 16,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    errorMessage: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#3B82F6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        marginTop: 8,
    },
    retryText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 16,
        gap: 16,
        paddingBottom: 100,
    },
    itemCard: {
        padding: 12,
        borderRadius: 16,
        borderColor: 'transparent',
    },
    itemContent: {
        gap: 12,
    },
    itemTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    itemCover: {
        width: 64,
        height: 64,
        borderRadius: 12,
        backgroundColor: '#1E293B',
    },
    itemInfo: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    itemArtist: {
        fontSize: 14,
        color: '#94A3B8',
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIcon: {
        color: '#60A5FA',
        fontSize: 14,
        marginLeft: 2,
    },
    // Movie card styles
    movieCard: {
        padding: 0,
    },
    movieHeader: {
        flexDirection: 'row',
        gap: 12,
    },
    moviePoster: {
        width: 100,
        height: 150,
        borderRadius: 8,
        backgroundColor: '#1E293B',
    },
    movieInfo: {
        flex: 1,
        gap: 8,
    },
    movieTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    movieMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    genreBadge: {
        backgroundColor: 'rgba(96, 165, 250, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    genreText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#60A5FA',
        textTransform: 'uppercase',
    },
    movieDuration: {
        fontSize: 12,
        color: '#64748B',
    },
    movieSynopsis: {
        fontSize: 12,
        color: '#94A3B8',
        lineHeight: 18,
    },
    trailerSection: {
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        paddingTop: 16,
    },
    watchTrailerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    trailerPlayIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    watchTrailerText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#EF4444',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    trailerContainer: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    closeTrailerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        paddingVertical: 10,
    },
    closeTrailerText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#94A3B8',
    },
    bottomActions: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        padding: 16,
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    changeMoodBtn: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        gap: 6,
    },
    changeMoodText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    exploreBtn: {
        flex: 2,
        borderRadius: 12,
        overflow: 'hidden',
    },
    exploreBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 12,
    },
    exploreBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    favoritesBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    favBtn: {
        padding: 8,
    },
    movieFavBtn: {
        padding: 4,
    },
});
