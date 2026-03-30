/**
 * PlayerScreen — Global Music/Video Player
 * 
 * REFACTORED: Now uses PlayerContext for all playback state.
 * Single YouTube player instance via react-native-youtube-iframe.
 * 
 * KEY BEHAVIORS:
 * - Music tab: Shows album art + custom controls + progress bar
 * - Video tab: Shows YouTube player + controls
 * - Switching tabs does NOT restart playback
 * - Queue management through PlayerContext
 * - Real progress bar synced with YouTube player
 */

import React, { useCallback, useContext, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { YouTubePlayer, extractYouTubeId, YouTubePlayerRef } from '../components';
import { NavigationProp, MediaItem } from '../types';
import { AppContext } from '../context/AppContext';
import { usePlayer } from '../context/PlayerContext';
import { ICON_STYLE } from '../constants';

export const PlayerScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const { toggleFavorite, isFavorite } = useContext(AppContext);
    const playerRef = useRef<YouTubePlayerRef>(null);

    // All playback state comes from the global PlayerContext
    const {
        state: { currentTrack, queue, history, isPlaying, isVideoMode, currentTime, duration },
        pause,
        resume,
        togglePlay,
        next,
        previous,
        setVideoMode,
        setTime,
        playFromQueue,
    } = usePlayer();

    const screenWidth = Dimensions.get('window').width;
    const trackWidth = screenWidth - 48;
    const videoHeight = (screenWidth - 48) * (9 / 16);

    // Get the videoId — either from the dedicated field or extracted from URL
    const videoId = currentTrack?.videoId ||
        (currentTrack?.videoUrl ? extractYouTubeId(currentTrack.videoUrl) : null);

    /**
     * Format seconds to "m:ss" display format
     */
    const formatTime = useCallback((seconds: number): string => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    /**
     * Calculate progress percentage for the progress bar
     */
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    /**
     * Handle YouTube player state changes — sync with PlayerContext
     */
    const handleStateChange = useCallback((state: string) => {
        if (state === 'ended') {
            // Auto-play next track when current one ends
            next();
        }
    }, [next]);

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
                    onPress={() => navigation.goBack()}
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
                            onPress={() => setVideoMode(true)}
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
                {/* ALWAYS RENDER YOUTUBE PLAYER, OVERLAY ALBUM ART IN MUSIC MODE */}
                {videoId && (
                    <View style={[styles.coverContainer, isVideoMode && styles.coverVideo]}>
                        <View pointerEvents={isVideoMode ? "auto" : "none"}>
                            <YouTubePlayer
                                ref={playerRef}
                                videoId={videoId}
                                height={isVideoMode ? videoHeight : screenWidth - 48}
                                autoplay={true}
                                isPlaying={isPlaying}
                                onStateChange={handleStateChange}
                                onProgress={handleProgress}
                            />
                        </View>

                        {/* Music Mode: Show album art with play overlay OVER the hidden video */}
                        {!isVideoMode && (
                            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                                <Image
                                    source={{ uri: currentTrack.albumArt || currentTrack.cover }}
                                    style={[styles.coverImage, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}
                                />
                                <TouchableOpacity
                                    style={[styles.playOverlay, isPlaying && styles.playOverlayHidden]}
                                    onPress={togglePlay}
                                >
                                    <View style={styles.playOverlayBtn}>
                                        <Icon
                                            name={isPlaying ? 'pause' : 'play'}
                                            size={32}
                                            color="#FFFFFF"
                                            style={ICON_STYLE}
                                        />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* Track Info */}
                <View style={styles.infoArea}>
                    <View style={styles.infoText}>
                        <Text style={styles.itemTitle} numberOfLines={1}>{currentTrack.title}</Text>
                        <Text style={styles.itemArtist}>{currentTrack.artist}</Text>
                    </View>
                    <View style={styles.feedbackBtns}>
                        <TouchableOpacity style={styles.feedbackBtn}>
                            <Icon name="thumbs-up" size={20} color="#60A5FA" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.feedbackBtnDanger}>
                            <Icon name="thumbs-down" size={20} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Progress Bar — Now shows REAL progress from YouTube player */}
                {!isVideoMode && (
                    <View style={styles.progressContainer}>
                        <TouchableOpacity 
                            style={styles.progressTrack}
                            activeOpacity={1}
                            onPress={(e) => {
                                if (duration > 0 && playerRef.current) {
                                    const percent = Math.max(0, Math.min(1, e.nativeEvent.locationX / trackWidth));
                                    playerRef.current.seekTo(percent * duration);
                                }
                            }}
                        >
                            <View style={[styles.progressFill, { width: `${Math.min(progressPercent, 100)}%` }]} />
                            <View style={[styles.progressThumb, { left: `${Math.min(progressPercent, 100)}%` }]} />
                        </TouchableOpacity>
                        <View style={styles.progressTimes}>
                            <Text style={styles.progressTime}>{formatTime(currentTime)}</Text>
                            <Text style={styles.progressTime}>
                                {duration > 0 ? formatTime(duration) : (currentTrack.duration || '0:00')}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Playback Controls */}
                <View style={styles.controls}>
                    <TouchableOpacity>
                        <Icon name="shuffle" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={previous}
                        style={[styles.controlBtn, history.length === 0 && styles.controlDisabled]}
                    >
                        <Icon name="skip-back" size={32} color={history.length === 0 ? "#475569" : "#FFFFFF"} />
                    </TouchableOpacity>
                    {!isVideoMode && (
                        <TouchableOpacity
                            style={styles.mainPlayBtn}
                            onPress={togglePlay}
                        >
                            <LinearGradient
                                colors={['#2563EB', '#4F46E5']}
                                style={styles.mainPlayBtnGradient}
                            >
                                <Icon
                                    name={isPlaying ? 'pause' : 'play'}
                                    size={32}
                                    color="#FFFFFF"
                                />
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={next}
                        style={[styles.controlBtn, queue.length === 0 && styles.controlDisabled]}
                    >
                        <Icon name="skip-forward" size={32} color={queue.length === 0 ? "#475569" : "#FFFFFF"} />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Icon name="repeat" size={20} color="#94A3B8" />
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
                                            <Icon name="play" size={12} color="#FFFFFF" />
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

            {/* Hidden YouTube player for audio mode — keeps audio playing */}
            {!isVideoMode && videoId && (
                <View style={styles.hiddenPlayer}>
                    <YouTubePlayer
                        videoId={videoId}
                        height={1}
                        isPlaying={isPlaying}
                        onStateChange={handleStateChange}
                        onProgress={handleProgress}
                    />
                </View>
            )}
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
    coverVideo: {
        aspectRatio: 16 / 9,
        borderRadius: 12,
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
    feedbackBtnDanger: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Progress bar
    progressContainer: {
        marginBottom: 24,
    },
    progressTrack: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
        overflow: 'visible',
        marginBottom: 8,
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
    // Hidden player for audio mode (plays audio without showing video)
    hiddenPlayer: {
        position: 'absolute',
        top: -1000,
        left: 0,
        width: 300,
        height: 200,
        opacity: 0.01,
        overflow: 'hidden',
    },
});
