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
    Modal,
    ActivityIndicator,
    Dimensions,
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
import { fetchRecommendations, fetchMovieRecommendations, fetchMovieTrailer } from '../services/api';
import { getPreferencesFromFirestore } from '../services/firestorePreferences';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type ResultsRouteProp = RouteProp<RootStackParamList, 'Results'>;

export const ResultsScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<ResultsRouteProp>();
    const { emotion, initialTab } = route.params;
    const { toggleFavorite, isFavorite } = useContext(AppContext);
    const { playTrack } = usePlayer();

    const [activeTab] = useState(initialTab);

    // User preferences for personalized movie picks
    const [movieGenres, setMovieGenres] = useState<string[]>([]);
    const [movieNightVibe, setMovieNightVibe] = useState<string>('');

    // Movie detail modal state
    const [selectedMovie, setSelectedMovie] = useState<MediaItem | null>(null);
    const [modalTrailerState, setModalTrailerState] = useState<
        { videoId: string; videoUrl: string } | 'loading' | 'not_found' | null
    >(null);

    // API state
    const [tracks, setTracks] = useState<MediaItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState(false);

    // Load user preferences from Firestore once on mount
    useEffect(() => {
        getPreferencesFromFirestore()
            .then(prefs => {
                if (prefs.movieGenres?.length) setMovieGenres(prefs.movieGenres);
                if (prefs.movieNightVibe) setMovieNightVibe(prefs.movieNightVibe);
            })
            .catch(() => {});
    }, []);

    /**
     * Fetch recommendations from backend API.
     * Falls back to hardcoded data if API is unreachable.
     */
    const loadRecommendations = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        if (activeTab === 'Movie') {
            try {
                const response = await fetchMovieRecommendations(
                    emotion,
                    20,
                    undefined,
                    movieGenres.length > 0 ? movieGenres : undefined,
                    movieNightVibe || undefined,
                );
                if (response.data && response.data.length > 0) {
                    const mapped: MediaItem[] = response.data.map((movie) => ({
                        id: movie.id,
                        title: movie.title,
                        artist: movie.artist,
                        duration: movie.duration,
                        cover: movie.cover,
                        rating: movie.rating,
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
    }, [emotion, activeTab, movieGenres, movieNightVibe]);

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

    /** Open a movie's detail + trailer modal */
    const openMovieModal = (item: MediaItem) => {
        setSelectedMovie(item);
        setModalTrailerState(null);
    };

    const closeMovieModal = () => {
        setSelectedMovie(null);
        setModalTrailerState(null);
    };

    /** Fetch trailer on-demand when user taps Watch Trailer inside the modal */
    const handleModalTrailer = async () => {
        if (!selectedMovie || modalTrailerState !== null) return;
        setModalTrailerState('loading');
        const result = await fetchMovieTrailer(selectedMovie.title);
        setModalTrailerState(result ?? 'not_found');
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
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header — compact single-row */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.navigate('Chatbot', { detectedEmotion: emotion, backToChoices: true })}
                    >
                        <Icon name="arrow-left" size={15} color="#94A3B8" style={ICON_STYLE} />
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>

                    <View style={styles.moodSection}>
                        <Text style={styles.moodLabel}>Mood</Text>
                        <Text style={styles.moodText}>{emotion}</Text>
                    </View>

                    <View style={styles.headerActions}>
                        <View style={styles.tabIcon}>
                            {getTabIcon()}
                        </View>
                        <TouchableOpacity
                            style={styles.favoritesBtn}
                            onPress={() => navigation.navigate('Favorites')}
                        >
                            <Icon name="heart" size={15} color="#FFFFFF" style={{ marginTop: 2 /* visual fix for heart */ }} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.statusRow}>
                    <Text style={styles.description}>
                        Showing <Text style={styles.descriptionBold}>{activeTab}</Text> recommendations
                    </Text>
                    {isOffline && (
                        <View style={styles.offlineBadge}>
                            <Icon name="wifi-off" size={11} color="#F59E0B" />
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
                                /* ── Premium Movie Card (tap to open modal) ── */
                                <TouchableOpacity activeOpacity={0.85} onPress={() => openMovieModal(item)}>
                                    <View style={styles.movieCard}>
                                        <View style={styles.movieHeader}>
                                            <Image source={{ uri: item.cover }} style={styles.moviePoster} />
                                            <View style={styles.movieInfo}>
                                                <View style={styles.movieTitleRow}>
                                                    <Text style={[styles.movieTitle, { flex: 1 }]} numberOfLines={2}>
                                                        {item.title}
                                                    </Text>
                                                    <TouchableOpacity
                                                        style={styles.movieFavBtn}
                                                        onPress={() => toggleFavorite({ ...item, type: activeTab })}
                                                    >
                                                        <Icon name="heart" size={20} color={isFavorite(item.id) ? '#EF4444' : '#FFFFFF'} />
                                                    </TouchableOpacity>
                                                </View>
                                                <View style={styles.movieMeta}>
                                                    <View style={styles.genreBadge}>
                                                        <Text style={styles.genreText} numberOfLines={1}>{item.artist}</Text>
                                                    </View>
                                                </View>
                                                {item.rating != null && (() => {
                                                    const score = item.rating;
                                                    const badgeColor = score >= 7 ? '#10B981' : score >= 5 ? '#F59E0B' : '#EF4444';
                                                    const starsOf5 = score / 2;
                                                    const fullStars = Math.floor(starsOf5);
                                                    const hasHalf = (starsOf5 - fullStars) >= 0.4;
                                                    return (
                                                        <View style={styles.ratingBlock}>
                                                            <View style={[styles.ratingBadge, { backgroundColor: badgeColor + '22', borderColor: badgeColor }]}>
                                                                <Text style={styles.ratingBadgeIcon}>⭐</Text>
                                                                <Text style={[styles.ratingBadgeText, { color: badgeColor }]}>{score.toFixed(1)}</Text>
                                                                <Text style={styles.ratingScale}>/10</Text>
                                                            </View>
                                                            <View style={styles.starsRow}>
                                                                {[1, 2, 3, 4, 5].map(i => (
                                                                    <Text key={i} style={[styles.starChar, i <= fullStars ? styles.starFull : (i === fullStars + 1 && hasHalf) ? styles.starHalf : styles.starEmpty]}>
                                                                        {i <= fullStars ? '★' : (i === fullStars + 1 && hasHalf) ? '½' : '☆'}
                                                                    </Text>
                                                                ))}
                                                            </View>
                                                        </View>
                                                    );
                                                })()}
                                                {item.description && (
                                                    <Text style={styles.movieSynopsis} numberOfLines={2}>
                                                        {item.description}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                        <View style={styles.movieTapHint}>
                                            <Icon name="film" size={11} color="#475569" />
                                            <Text style={styles.movieTapHintText}>Tap for details & trailer</Text>
                                            <Icon name="chevron-right" size={11} color="#475569" />
                                        </View>
                                    </View>
                                </TouchableOpacity>
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
                                            <Icon name="play" size={13} color="#60A5FA" style={{ marginLeft: 2 }} />
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

            {/* ──── Movie Detail Modal ──── */}
            <Modal
                visible={selectedMovie !== null}
                animationType="slide"
                transparent={true}
                statusBarTranslucent
                onRequestClose={closeMovieModal}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeMovieModal} />
                    <View style={styles.modalSheet}>
                        <ScrollView showsVerticalScrollIndicator={false} bounces={true}>
                            {/* Hero Poster */}
                            <View style={styles.modalPosterWrap}>
                                <Image source={{ uri: selectedMovie?.cover }} style={styles.modalPosterImg} resizeMode="cover" />
                                <LinearGradient
                                    colors={['rgba(2,6,23,0)', 'rgba(2,6,23,0.65)', 'rgba(11,17,32,1)']}
                                    style={styles.modalPosterGradient}
                                />
                                <TouchableOpacity style={styles.modalCloseBtn} onPress={closeMovieModal}>
                                    <Icon name="x" size={18} color="#FFFFFF" />
                                </TouchableOpacity>
                                <View style={styles.modalPosterTitleWrap}>
                                    <Text style={styles.modalPosterTitle} numberOfLines={2}>{selectedMovie?.title}</Text>
                                </View>
                            </View>

                            <View style={styles.modalContent}>
                                {/* Genre + Rating badge + Heart */}
                                <View style={styles.modalMetaRow}>
                                    <View style={styles.genreBadge}>
                                        <Text style={styles.genreText}>{selectedMovie?.artist}</Text>
                                    </View>
                                    {selectedMovie?.rating != null && (() => {
                                        const score = selectedMovie.rating!;
                                        const badgeColor = score >= 7 ? '#10B981' : score >= 5 ? '#F59E0B' : '#EF4444';
                                        return (
                                            <View style={[styles.ratingBadge, { backgroundColor: badgeColor + '22', borderColor: badgeColor }]}>
                                                <Text style={styles.ratingBadgeIcon}>⭐</Text>
                                                <Text style={[styles.ratingBadgeText, { color: badgeColor }]}>{score.toFixed(1)}</Text>
                                                <Text style={styles.ratingScale}>/10</Text>
                                            </View>
                                        );
                                    })()}
                                    <View style={{ flex: 1 }} />
                                    <TouchableOpacity
                                        style={styles.modalFavBtn}
                                        onPress={() => selectedMovie && toggleFavorite({ ...selectedMovie, type: 'Movie' })}
                                    >
                                        <Icon
                                            name="heart"
                                            size={22}
                                            color={selectedMovie && isFavorite(selectedMovie.id) ? '#EF4444' : '#FFFFFF'}
                                        />
                                    </TouchableOpacity>
                                </View>

                                {/* Star row */}
                                {selectedMovie?.rating != null && (() => {
                                    const score = selectedMovie.rating!;
                                    const starsOf5 = score / 2;
                                    const fullStars = Math.floor(starsOf5);
                                    const hasHalf = (starsOf5 - fullStars) >= 0.4;
                                    return (
                                        <View style={styles.modalStarsRow}>
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <Text key={i} style={[styles.starChar, i <= fullStars ? styles.starFull : (i === fullStars + 1 && hasHalf) ? styles.starHalf : styles.starEmpty]}>
                                                    {i <= fullStars ? '★' : (i === fullStars + 1 && hasHalf) ? '½' : '☆'}
                                                </Text>
                                            ))}
                                            <Text style={styles.modalRatingLabel}> {selectedMovie.rating!.toFixed(1)} / 10</Text>
                                        </View>
                                    );
                                })()}

                                <View style={styles.modalDivider} />

                                {/* Synopsis */}
                                {selectedMovie?.description && (
                                    <>
                                        <Text style={styles.modalSectionLabel}>Synopsis</Text>
                                        <Text style={styles.modalSynopsis}>{selectedMovie.description}</Text>
                                    </>
                                )}

                                <View style={styles.modalDivider} />

                                {/* Trailer */}
                                <Text style={styles.modalSectionLabel}>🎬  Trailer</Text>
                                {modalTrailerState === null && (
                                    <TouchableOpacity style={styles.watchTrailerBtn} onPress={handleModalTrailer}>
                                        <View style={styles.trailerPlayIcon}>
                                            <Icon name="play" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
                                        </View>
                                        <Text style={styles.watchTrailerText}>Watch Trailer</Text>
                                    </TouchableOpacity>
                                )}
                                {modalTrailerState === 'loading' && (
                                    <View style={styles.trailerLoadingBox}>
                                        <ActivityIndicator size="small" color="#EF4444" />
                                        <Text style={styles.trailerLoadingText}>  Loading trailer...</Text>
                                    </View>
                                )}
                                {modalTrailerState === 'not_found' && (
                                    <View style={styles.trailerLoadingBox}>
                                        <Text style={styles.trailerLoadingText}>😕 Trailer not available</Text>
                                    </View>
                                )}
                                {modalTrailerState && modalTrailerState !== 'loading' && modalTrailerState !== 'not_found' && (
                                    <View style={styles.trailerContainer}>
                                        <YouTubePlayer
                                            videoId={(modalTrailerState as { videoId: string }).videoId}
                                            height={210}
                                            autoplay={true}
                                        />
                                    </View>
                                )}

                                <View style={{ height: 24 }} />
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
    },
    header: {
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 4,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
    },
    backText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#94A3B8',
    },
    moodSection: {
        flex: 1,
        alignItems: 'center',
    },
    moodLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.5)',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    moodText: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        lineHeight: 24,
    },
    tabIcon: {
        padding: 7,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        marginTop: 8,
        marginBottom: 4,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 2,
        paddingBottom: 4,
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
        paddingBottom: 24,
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
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
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
        height: 155,
        borderRadius: 10,
        backgroundColor: '#1E293B',
    },
    movieInfo: {
        flex: 1,
        gap: 6,
    },
    movieTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    movieTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF',
        lineHeight: 20,
    },
    movieMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    genreBadge: {
        backgroundColor: 'rgba(96, 165, 250, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(96, 165, 250, 0.3)',
        maxWidth: 150,
    },
    genreText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#60A5FA',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    movieDuration: {
        fontSize: 11,
        color: '#64748B',
    },
    // ── Rating styles ────────────────────────────────────────────
    ratingBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 2,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    ratingBadgeIcon: {
        fontSize: 11,
    },
    ratingBadgeText: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    ratingScale: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '500',
    },
    starsRow: {
        flexDirection: 'row',
        gap: 1,
    },
    starChar: {
        fontSize: 13,
    },
    starFull: {
        color: '#FBBF24',
    },
    starHalf: {
        color: '#FCD34D',
    },
    starEmpty: {
        color: '#334155',
    },
    // ────────────────────────────────────────────────────────────
    movieSynopsis: {
        fontSize: 12,
        color: '#94A3B8',
        lineHeight: 18,
        marginTop: 2,
    },
    movieTapHint: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    movieTapHintText: {
        fontSize: 11,
        color: '#475569',
        fontWeight: '500',
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
        overflow: 'hidden',
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
    // Modal styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.65)',
    },
    modalBackdrop: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
    },
    modalSheet: {
        backgroundColor: '#0B1120',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: SCREEN_HEIGHT * 0.88,
        overflow: 'hidden',
    },
    modalPosterWrap: {
        width: '100%',
        height: 230,
    },
    modalPosterImg: {
        width: '100%',
        height: '100%',
    },
    modalPosterGradient: {
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        height: 150,
    },
    modalCloseBtn: {
        position: 'absolute',
        top: 14,
        right: 14,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalPosterTitleWrap: {
        position: 'absolute',
        bottom: 14,
        left: 16,
        right: 56,
    },
    modalPosterTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        lineHeight: 28,
        textShadowColor: 'rgba(0,0,0,0.9)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 8,
    },
    modalContent: {
        padding: 16,
    },
    modalMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    modalFavBtn: {
        padding: 6,
    },
    modalStarsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    modalRatingLabel: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '500',
        marginLeft: 4,
    },
    modalDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.07)',
        marginVertical: 16,
    },
    modalSectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.45)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 10,
    },
    modalSynopsis: {
        fontSize: 14,
        color: '#CBD5E1',
        lineHeight: 22,
    },
    trailerLoadingBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 12,
        marginBottom: 4,
    },
    trailerLoadingText: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '500',
    },
    bottomActions: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    changeMoodBtn: {
        flex: 1,
        paddingHorizontal: 8,
        paddingVertical: 8,
        alignItems: 'center',
        gap: 4,
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
        paddingHorizontal: 12,
        paddingVertical: 9,
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
