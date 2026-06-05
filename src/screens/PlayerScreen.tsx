/**
 * PlayerScreen — Global Music/Video Player
 * 
 * ARCHITECTURE: Single YouTube player instance for both audio and video modes.
 * In music mode, the player is hidden offscreen and album art is shown.
 * In video mode, the player is shown at full 16:9 size.
 * 
 * KEY BEHAVIORS:
 * - Music tab: Shows album art + custom controls + progress bar
 * - Video tab: Shows YouTube player + controls + progress bar
 * - Switching tabs does NOT restart playback (same player instance)
 * - Queue management through PlayerContext
 * - Real progress bar synced with YouTube player via polling
 * - Seek support via playerRef.seekTo()
 */

import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    Image,
    Dimensions,
    Alert,
    Animated,
    Easing,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { YouTubePlayer, extractYouTubeId, YouTubePlayerRef } from '../components';
import { NavigationProp, MediaItem } from '../types';
import { AppContext } from '../context/AppContext';
import { usePlayer } from '../context/PlayerContext';
import { ICON_STYLE } from '../constants';
import { sendFeedback, fetchYouTubeVideoId } from '../services/api';
import {
    getPlayerState,
    playTrack as spotifyPlayTrack,
    pausePlayback,
    resumePlayback,
    seekTo as spotifySeekTo,
    skipNext as spotifySkipNext,
    skipPrevious as spotifySkipPrevious,
} from '../services/spotify';
import { isSpotifyTrackMatch } from '../utils/playlist';

const TRACK_END_COOLDOWN_MS = 4000;
const TRACK_END_THRESHOLD_SEC = 0.5;

export const PlayerScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const { toggleFavorite, isFavorite, userData } = useContext(AppContext);
    const playerRef = useRef<YouTubePlayerRef>(null);
    const [trackFeedback, setTrackFeedback] = useState<'like' | 'dislike' | null>(null);

    // All playback state comes from the global PlayerContext
    const {
        state: {
            currentTrack,
            queue,
            history,
            isShuffle,
            repeatMode,
            playEpoch,
            isPlaying,
            isVideoMode,
            currentTime,
            duration,
        },
        pause,
        resume,
        togglePlay,
        setPlaying,
        next,
        previous,
        onTrackEnded,
        replayCurrent,
        toggleShuffle,
        cycleRepeat,
        setVideoMode,
        setTime,
        playFromQueue,
        updateVideoId,
    } = usePlayer();

    const screenWidth = Dimensions.get('window').width;
    const videoHeight = (screenWidth - 48) * (9 / 16);
    const [measuredTrackWidth, setMeasuredTrackWidth] = useState(screenWidth - 48);

    // ── Pulsing animation for the play button when audio is playing ──
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isPlaying) {
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: -6,
                        duration: 400,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 0,
                        duration: 400,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );
            loop.start();
            return () => loop.stop();
        } else {
            pulseAnim.setValue(0);
        }
    }, [isPlaying, pulseAnim]);

    /**
     * Guard: If music is playing, prompt user to pause before switching to Video mode.
     */
    const handleSwitchToVideo = useCallback(() => {
        if (isPlaying && !isVideoMode) {
            Alert.alert(
                '⏸  Pause Audio First',
                'Music is currently playing. Would you like to pause it and switch to Video mode?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Pause & Switch',
                        style: 'default',
                        onPress: async () => {
                            await pausePlayback();
                            pause();
                            setVideoMode(true);
                        },
                    },
                ]
            );
        } else {
            setVideoMode(true);
        }
    }, [isPlaying, isVideoMode, pause, setVideoMode]);

    /**
     * Guard: If music is playing, prompt user to pause before navigating back.
     */
    const handleGoBack = useCallback(() => {
        if (isPlaying) {
            Alert.alert(
                '⏸  Pause Audio First',
                'Music is still playing. Would you like to pause it before going back?',
                [
                    { text: 'Keep Playing', style: 'cancel', onPress: () => navigation.goBack() },
                    {
                        text: 'Pause & Go Back',
                        style: 'default',
                        onPress: async () => {
                            if (!isVideoMode) {
                                await pausePlayback();
                            }
                            pause();
                            navigation.goBack();
                        },
                    },
                ]
            );
        } else {
            navigation.goBack();
        }
    }, [isPlaying, isVideoMode, pause, navigation]);

    // Get the videoId — either from the dedicated field or extracted from URL
    const videoId = currentTrack?.videoId ||
        (currentTrack?.videoUrl ? extractYouTubeId(currentTrack.videoUrl) : null);

    const [isFetchingVideo, setIsFetchingVideo] = useState(false);

    /**
     * Fetch YouTube videoId on-demand when switching to video mode
     */
    useEffect(() => {
        let isMounted = true;
        if (isVideoMode && !videoId && currentTrack && !isFetchingVideo) {
            setIsFetchingVideo(true);
            fetchYouTubeVideoId(currentTrack.title, currentTrack.artist)
                .then((newVideoId) => {
                    if (isMounted && newVideoId) {
                        updateVideoId(newVideoId);
                    }
                })
                .finally(() => {
                    if (isMounted) setIsFetchingVideo(false);
                });
        }
        return () => { isMounted = false; };
    }, [isVideoMode, videoId, currentTrack?.id]);

    /**
     * Format seconds to "m:ss" display format
     */
    const formatTime = useCallback((seconds: number): string => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    const effectiveDuration =
        duration > 0
            ? duration
            : currentTrack?.durationMs
                ? currentTrack.durationMs / 1000
                : 0;

    /**
     * Calculate progress percentage for the progress bar
     */
    const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

    /**
     * Handle seeking when user taps on the progress bar
     */
    const handleSeek = useCallback((locationX: number) => {
        if (effectiveDuration <= 0 || measuredTrackWidth <= 0) return;

        const percent = Math.max(0, Math.min(1, locationX / measuredTrackWidth));
        const seekTime = percent * effectiveDuration;

        // Update UI immediately so seek feels responsive (Spotify poll is ~1s)
        setTime(seekTime, effectiveDuration);

        if (isVideoMode) {
            playerRef.current?.seekTo(seekTime);
        } else {
            spotifySeekTo(Math.floor(seekTime * 1000));
        }
    }, [effectiveDuration, measuredTrackWidth, isVideoMode, setTime]);

    /**
     * Music mode: when track changes OR mode toggles back from video,
     * drive playback via Spotify Remote with proper cleanup.
     *
     * FIX: Pauses stale audio immediately, passes currentTime for
     * seamless Video→Audio handoff, and aborts if track changes mid-fetch.
     */
    useEffect(() => {
        if (isVideoMode) return;
        const spotifyId = currentTrack?.spotifyId;
        if (!spotifyId) return;

        let cancelled = false;

        (async () => {
            // Silence stale audio immediately to prevent race condition
            await pausePlayback().catch(() => {});
            if (cancelled) return; // Abort if track changed during pause

            // Forward the current timestamp (from video mode) as start position
            const seekMs = currentTime > 0 ? currentTime * 1000 : undefined;
            await spotifyPlayTrack(spotifyId, seekMs);
        })();

        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Note: currentTime intentionally excluded — we only want this to fire
    // on track change or mode toggle, reading currentTime as a snapshot.
    }, [currentTrack?.id, currentTrack?.spotifyId, isVideoMode, playEpoch]);

    const trackEndedRef = useRef(false);
    const advanceCooldownUntilRef = useRef(0);

    useEffect(() => {
        trackEndedRef.current = false;
        advanceCooldownUntilRef.current = Date.now() + TRACK_END_COOLDOWN_MS;
    }, [currentTrack?.id, playEpoch]);

    const handleMusicTrackEnd = useCallback(() => {
        if (trackEndedRef.current || Date.now() < advanceCooldownUntilRef.current) {
            return;
        }

        trackEndedRef.current = true;
        advanceCooldownUntilRef.current = Date.now() + TRACK_END_COOLDOWN_MS;

        if (repeatMode === 'one') {
            spotifySeekTo(0).then(() => resumePlayback());
            replayCurrent();
            return;
        }

        onTrackEnded();
    }, [repeatMode, onTrackEnded, replayCurrent]);

    /**
     * Music mode: poll Spotify and advance only when the current playlist
     * track has genuinely finished (prevents stale poll data from skipping ahead).
     */
    useEffect(() => {
        if (isVideoMode || !currentTrack) return;

        let cancelled = false;
        const pollMs = 1000;

        const pollPlayback = async () => {
            const state = await getPlayerState();
            if (cancelled || !state) return;

            const positionSec = state.playbackPosition / 1000;
            const durationSec = state.duration / 1000;

            setTime(positionSec, durationSec);
            setPlaying(!state.isPaused);

            if (
                !state.isPaused &&
                durationSec > 3 &&
                positionSec >= durationSec - TRACK_END_THRESHOLD_SEC &&
                isSpotifyTrackMatch(state.trackName, currentTrack)
            ) {
                handleMusicTrackEnd();
            }
        };

        pollPlayback();
        const pollTimer = setInterval(pollPlayback, pollMs);

        return () => {
            cancelled = true;
            clearInterval(pollTimer);
        };
    }, [isVideoMode, currentTrack, handleMusicTrackEnd, setPlaying, setTime]);

    const canGoPrevious = history.length > 0;
    const canGoNext = queue.length > 0 || repeatMode === 'all';

    const handleTogglePlay = useCallback(async () => {
        if (isVideoMode) {
            togglePlay();
            return;
        }

        if (isPlaying) {
            await pausePlayback();
            pause();
        } else {
            await resumePlayback();
            resume();
        }
    }, [isVideoMode, isPlaying, pause, resume, togglePlay]);

    const handleNext = useCallback(async () => {
        if (queue.length > 0 || repeatMode === 'all') {
            advanceCooldownUntilRef.current = Date.now() + TRACK_END_COOLDOWN_MS;
            trackEndedRef.current = true;
            next();
            return;
        }

        if (!isVideoMode) {
            await spotifySkipNext();
        }
    }, [isVideoMode, next, queue.length, repeatMode]);

    const handlePrevious = useCallback(async () => {
        if (isVideoMode) {
            previous();
            return;
        }

        if (history.length > 0) {
            previous(); // will trigger spotifyPlayTrack via effect
            return;
        }

        await spotifySkipPrevious();
    }, [isVideoMode, previous, history.length]);

    /**
     * Handle track feedback (like/dislike) — sends to backend
     */
    const handleFeedback = useCallback(async (action: 'like' | 'dislike') => {
        if (!currentTrack) return;
        const newAction = trackFeedback === action ? null : action;
        setTrackFeedback(newAction);

        if (newAction) {
            const userId = userData?.email || userData?.name || 'default_user';
            await sendFeedback({
                userId,
                trackId: currentTrack.spotifyId || String(currentTrack.id),
                action: newAction,
            });
        }
    }, [currentTrack, trackFeedback, userData]);

    // Reset feedback state when track changes
    useEffect(() => {
        setTrackFeedback(null);
    }, [currentTrack?.id]);

    /**
     * Handle YouTube player state changes — sync with PlayerContext
     */
    const handleStateChange = useCallback((state: string) => {
        if (state === 'ended') {
            // Send skip feedback for tracks user didn't explicitly like
            if (!trackFeedback) {
                const userId = userData?.email || userData?.name || 'default_user';
                sendFeedback({
                    userId,
                    trackId: currentTrack?.spotifyId || String(currentTrack?.id),
                    action: 'skip',
                });
            }

            if (repeatMode === 'one') {
                playerRef.current?.seekTo(0);
                resume();
                replayCurrent();
                return;
            }

            if (trackEndedRef.current || Date.now() < advanceCooldownUntilRef.current) {
                return;
            }

            trackEndedRef.current = true;
            advanceCooldownUntilRef.current = Date.now() + TRACK_END_COOLDOWN_MS;
            onTrackEnded();
        }
    }, [onTrackEnded, replayCurrent, resume, repeatMode, trackFeedback, currentTrack, userData]);

    /**
     * Handle progress updates from YouTube player
     */
    const handleProgress = useCallback((time: number, dur: number) => {
        setTime(time, dur);
    }, [setTime]);

    if (!currentTrack) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.emptyState}>
                    <Icon name="music" size={48} color="#64748B" />
                    <Text style={styles.emptyText}>No track playing</Text>
                    <TouchableOpacity
                        style={styles.emptyBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.emptyBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerBtn}
                    onPress={handleGoBack}
                >
                    <Icon name="chevron-down" size={28} color="#FFFFFF" style={ICON_STYLE} />
                </TouchableOpacity>

                {/* Mode Switcher — Toggle between Music and Video */}
                <View style={styles.modeSwitcherContainer}>
                    <View style={styles.modeSwitcher}>
                        <TouchableOpacity
                            style={[styles.modeBtn, !isVideoMode && styles.modeBtnActive]}
                            onPress={() => setVideoMode(false)}
                        >
                            <Text style={[styles.modeBtnText, !isVideoMode && styles.modeBtnTextActive]}>Music</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modeBtn, isVideoMode && styles.modeBtnActive]}
                            onPress={handleSwitchToVideo}
                        >
                            <Text style={[styles.modeBtnText, isVideoMode && styles.modeBtnTextActive]}>Video</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => toggleFavorite(currentTrack)}
                    >
                        <Icon
                            name="heart"
                            size={24}
                            color={isFavorite(currentTrack.id) ? "#EF4444" : "#FFFFFF"}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.mainContent}
                contentContainerStyle={styles.mainContentInner}
                showsVerticalScrollIndicator={false}
            >
                {/* ===== VIDEO MODE: Show the YouTube player visually ===== */}
                {isVideoMode && videoId && !isFetchingVideo && (
                    <View style={styles.videoContainer}>
                        <YouTubePlayer
                            ref={playerRef}
                            videoId={videoId}
                            height={videoHeight}
                            autoplay={true}
                            isPlaying={isPlaying}
                            initialSeekSeconds={currentTime}
                            onStateChange={handleStateChange}
                            onProgress={handleProgress}
                        />
                    </View>
                )}
                
                {/* Visual loading state while fetching videoId via API */}
                {isVideoMode && (!videoId || isFetchingVideo) && (
                    <View style={[styles.coverContainer, { justifyContent: 'center', alignItems: 'center' }]}>
                        <Icon name="youtube" size={48} color="#EF4444" style={{ marginBottom: 16 }} />
                        <Text style={{ color: '#94A3B8', fontSize: 16 }}>{isFetchingVideo ? 'Searching YouTube...' : 'Video unavailable'}</Text>
                    </View>
                )}

                {/* ===== MUSIC MODE: Show album art with play overlay ===== */}
                {!isVideoMode && (
                    <View style={styles.coverContainer}>
                        <Image
                            source={{ uri: currentTrack.albumArt || currentTrack.cover }}
                            style={styles.coverImage}
                        />
                        <TouchableOpacity
                            style={[styles.playOverlay, isPlaying && styles.playOverlayHidden]}
                            onPress={handleTogglePlay}
                            activeOpacity={0.8}
                        >
                            <View style={styles.playOverlayBtn}>
                                <Icon
                                    name={isPlaying ? 'pause' : 'play'}
                                    size={32}
                                    color="#FFFFFF"
                                    style={!isPlaying ? { marginLeft: 4 } : undefined}
                                />
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Track Info */}
                <View style={styles.infoArea}>
                    <View style={styles.infoText}>
                        <Text style={styles.itemTitle} numberOfLines={1}>{currentTrack.title}</Text>
                        <Text style={styles.itemArtist}>{currentTrack.artist}</Text>
                    </View>
                    <View style={styles.feedbackBtns}>
                        <TouchableOpacity
                            style={[styles.feedbackBtn, trackFeedback === 'like' && styles.feedbackBtnActive]}
                            onPress={() => handleFeedback('like')}
                        >
                            <Icon name="thumbs-up" size={20} color={trackFeedback === 'like' ? '#FFFFFF' : '#60A5FA'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.feedbackBtnDanger, trackFeedback === 'dislike' && styles.feedbackBtnDangerActive]}
                            onPress={() => handleFeedback('dislike')}
                        >
                            <Icon name="thumbs-down" size={20} color={trackFeedback === 'dislike' ? '#FFFFFF' : '#EF4444'} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Progress Bar — large touch target; visual track stays thin */}
                <View style={styles.progressContainer}>
                    <Pressable
                        style={styles.progressTouchArea}
                        onLayout={(e) => setMeasuredTrackWidth(e.nativeEvent.layout.width)}
                        onPress={(e) => handleSeek(e.nativeEvent.locationX)}
                    >
                        <View style={styles.progressTrack} pointerEvents="none">
                            <View style={[styles.progressFill, { width: `${Math.min(progressPercent, 100)}%` }]} />
                            <View style={[styles.progressThumb, { left: `${Math.min(progressPercent, 100)}%` }]} />
                        </View>
                    </Pressable>
                    <View style={styles.progressTimes}>
                        <Text style={styles.progressTime}>{formatTime(currentTime)}</Text>
                        <Text style={styles.progressTime}>
                            {effectiveDuration > 0 ? formatTime(effectiveDuration) : (currentTrack.duration || '0:00')}
                        </Text>
                    </View>
                </View>

                {/* Playback Controls — wired to the global playlist for Music, Video, and Movie */}
                <View style={styles.controls}>
                    <TouchableOpacity
                        onPress={toggleShuffle}
                        style={styles.auxControlBtn}
                    >
                        <Icon
                            name="shuffle"
                            size={20}
                            color={isShuffle ? '#3B82F6' : '#94A3B8'}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handlePrevious}
                        disabled={!canGoPrevious}
                        style={[styles.controlBtn, !canGoPrevious && styles.controlDisabled]}
                    >
                        <Icon name="skip-back" size={32} color={canGoPrevious ? '#FFFFFF' : '#475569'} />
                    </TouchableOpacity>
                    <Animated.View style={{ transform: [{ translateY: pulseAnim }] }}>
                        <TouchableOpacity
                            style={styles.mainPlayBtn}
                            onPress={handleTogglePlay}
                        >
                            <LinearGradient
                                colors={isPlaying ? ['#EF4444', '#DC2626'] : ['#2563EB', '#4F46E5']}
                                style={styles.mainPlayBtnGradient}
                            >
                                <Icon
                                    name={isPlaying ? 'pause' : 'play'}
                                    size={32}
                                    color="#FFFFFF"
                                    style={!isPlaying ? { marginLeft: 4 } : undefined}
                                />
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                    <TouchableOpacity
                        onPress={handleNext}
                        disabled={!canGoNext}
                        style={[styles.controlBtn, !canGoNext && styles.controlDisabled]}
                    >
                        <Icon name="skip-forward" size={32} color={canGoNext ? '#FFFFFF' : '#475569'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={cycleRepeat}
                        style={styles.auxControlBtn}
                    >
                        <Icon
                            name="repeat"
                            size={20}
                            color={repeatMode !== 'off' ? '#3B82F6' : '#94A3B8'}
                        />
                        {repeatMode === 'one' && (
                            <Text style={styles.repeatOneBadge}>1</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Queue Section */}
                {queue.length > 0 && (
                    <View style={styles.queueSection}>
                        <Text style={styles.queueTitle}>Up Next ({queue.length})</Text>
                        <View style={styles.queueList}>
                            {queue.map((qItem, idx) => (
                                <TouchableOpacity
                                    key={`${qItem.id}-${idx}`}
                                    style={styles.queueItem}
                                    onPress={() => playFromQueue(qItem)}
                                >
                                    <View style={[styles.queueCover, isVideoMode && styles.queueCoverVideo]}>
                                        <Image
                                            source={{ uri: qItem.cover }}
                                            style={styles.queueCoverImage}
                                        />
                                        <View style={styles.queuePlayOverlay}>
                                            <Icon name="play" size={12} color="#FFFFFF" style={{ marginLeft: 2 }} />
                                        </View>
                                    </View>
                                    <View style={styles.queueInfo}>
                                        <Text style={styles.queueItemTitle} numberOfLines={1}>{qItem.title}</Text>
                                        <Text style={styles.queueItemArtist} numberOfLines={1}>{qItem.artist}</Text>
                                    </View>
                                    <Text style={styles.queueDuration}>{qItem.duration}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(2, 6, 23, 0.95)',
    },
    // Empty state
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    emptyText: {
        fontSize: 16,
        color: '#94A3B8',
    },
    emptyBtn: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
    },
    emptyBtnText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    modeSwitcherContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: -1,
    },
    modeSwitcher: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 30,
        padding: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    modeBtn: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 24,
    },
    modeBtnActive: {
        backgroundColor: '#3B82F6',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    modeBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#94A3B8',
    },
    modeBtnTextActive: {
        color: '#FFFFFF',
    },
    headerRight: {
        flexDirection: 'row',
        gap: 8,
    },
    // Main content
    mainContent: {
        flex: 1,
    },
    mainContentInner: {
        padding: 24,
        paddingBottom: 48,
    },
    // Video mode: visible YouTube player
    videoContainer: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 40,
        backgroundColor: '#000',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    // Music mode: album art cover
    coverContainer: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 32,
        overflow: 'hidden',
        marginBottom: 40,
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4,
        shadowRadius: 30,
        elevation: 15,
    },
    coverImage: {
        width: '100%',
        height: '100%',
        opacity: 0.9,
    },
    playOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    playOverlayHidden: {
        opacity: 0,
    },
    playOverlayBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Track info
    infoArea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 24,
    },
    infoText: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    itemArtist: {
        fontSize: 18,
        color: '#94A3B8',
        fontWeight: '500',
    },
    feedbackBtns: {
        flexDirection: 'row',
        gap: 12,
    },
    feedbackBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    feedbackBtnActive: {
        backgroundColor: '#3B82F6',
    },
    feedbackBtnDanger: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    feedbackBtnDangerActive: {
        backgroundColor: '#EF4444',
    },
    // Progress bar — 44px touch area, 6px visual track
    progressContainer: {
        marginBottom: 24,
    },
    progressTouchArea: {
        minHeight: 44,
        justifyContent: 'center',
        marginBottom: 4,
    },
    progressTrack: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
        overflow: 'visible',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 3,
    },
    progressThumb: {
        position: 'absolute',
        top: -3,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FFFFFF',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        marginLeft: -6,
    },
    progressTimes: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    progressTime: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },
    // Controls
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        paddingHorizontal: 12,
        marginBottom: 48,
    },
    controlBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    controlDisabled: {
        opacity: 0.5,
    },
    auxControlBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    repeatOneBadge: {
        position: 'absolute',
        right: 4,
        bottom: 6,
        fontSize: 10,
        fontWeight: '700',
        color: '#3B82F6',
    },
    mainPlayBtn: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    mainPlayBtnGradient: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Queue
    queueSection: {
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    queueTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    queueList: {
        gap: 12,
    },
    queueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 12,
        gap: 12,
    },
    queueCover: {
        width: 40,
        height: 40,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#1E293B',
    },
    queueCoverVideo: {
        width: 96,
        aspectRatio: 16 / 9,
    },
    queueCoverImage: {
        width: '100%',
        height: '100%',
        opacity: 0.7,
    },
    queuePlayOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        opacity: 0,
    },
    queueInfo: {
        flex: 1,
    },
    queueItemTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#FFFFFF',
    },
    queueItemArtist: {
        fontSize: 12,
        color: '#64748B',
    },
    queueDuration: {
        fontSize: 12,
        color: '#475569',
        fontFamily: 'monospace',
    },
});
