import React, { useState, useEffect, useRef, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    TextInput,
    Animated,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { YouTubePlayer, extractYouTubeId } from '../components';
import { NavigationProp, RootStackParamList, MediaItem, ChatMessage } from '../types';
import { AppContext } from '../context/AppContext';
import { ICON_STYLE } from '../constants';

type PlayerRouteProp = RouteProp<RootStackParamList, 'Player'>;

export const PlayerScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<PlayerRouteProp>();
    const { item: initialItem, queue: initialQueue, type } = route.params;
    const { toggleFavorite, isFavorite } = useContext(AppContext);



    const [currentItem, setCurrentItem] = useState(initialItem);
    const [queue, setQueue] = useState(initialQueue);
    const [history, setHistory] = useState<MediaItem[]>([]);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isVideoMode, setIsVideoMode] = useState(type === 'Video' || type === 'Movie');

    const scrollViewRef = useRef<ScrollView>(null);
    const screenWidth = Dimensions.get('window').width;
    const videoHeight = (screenWidth - 48) * (9 / 16);

    const handlePlayQueueItem = (queueItem: MediaItem) => {
        const index = queue.findIndex(i => i.id === queueItem.id);
        const newQueue = queue.slice(index + 1);
        setHistory(prev => [...prev, currentItem]);
        setCurrentItem(queueItem);
        setQueue(newQueue);
    };

    const handleNext = () => {
        if (queue.length > 0) {
            const nextItem = queue[0];
            const newQueue = queue.slice(1);
            setHistory(prev => [...prev, currentItem]);
            setCurrentItem(nextItem);
            setQueue(newQueue);
        }
    };

    const handlePrevious = () => {
        if (history.length > 0) {
            const previousItem = history[history.length - 1];
            const newHistory = history.slice(0, -1);
            setQueue(prev => [currentItem, ...prev]);
            setCurrentItem(previousItem);
            setHistory(newHistory);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Quick Chat Overlay */}


            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerBtn}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="chevron-down" size={28} color="#FFFFFF" style={ICON_STYLE} />
                </TouchableOpacity>

                {/* Mode Switcher - Centered Absolutely */}
                <View style={styles.modeSwitcherContainer}>
                    <View style={styles.modeSwitcher}>
                        <TouchableOpacity
                            style={[styles.modeBtn, !isVideoMode && styles.modeBtnActive]}
                            onPress={() => setIsVideoMode(false)}
                        >
                            <Text style={[styles.modeBtnText, !isVideoMode && styles.modeBtnTextActive]}>Music</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modeBtn, isVideoMode && styles.modeBtnActive]}
                            onPress={() => setIsVideoMode(true)}
                        >
                            <Text style={[styles.modeBtnText, isVideoMode && styles.modeBtnTextActive]}>Video</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => toggleFavorite(currentItem)}
                    >
                        <Icon
                            name="heart"
                            size={24}
                            color={isFavorite(currentItem.id) ? "#EF4444" : "#FFFFFF"}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.mainContent}
                contentContainerStyle={styles.mainContentInner}
                showsVerticalScrollIndicator={false}
            >
                {isVideoMode && currentItem.videoUrl ? (
                    <View style={[styles.coverContainer, styles.coverVideo]}>
                        <YouTubePlayer
                            videoId={extractYouTubeId(currentItem.videoUrl) || ''}
                            height={videoHeight}
                            autoplay={isPlaying}
                        />
                    </View>
                ) : (
                    <View style={[styles.coverContainer, isVideoMode && styles.coverVideo]}>
                        <Image
                            source={{ uri: currentItem.cover }}
                            style={styles.coverImage}
                        />
                        <TouchableOpacity
                            style={[styles.playOverlay, isPlaying && styles.playOverlayHidden]}
                            onPress={() => setIsPlaying(!isPlaying)}
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

                {/* Info Area */}
                <View style={styles.infoArea}>
                    <View style={styles.infoText}>
                        <Text style={styles.itemTitle} numberOfLines={1}>{currentItem.title}</Text>
                        <Text style={styles.itemArtist}>{currentItem.artist}</Text>
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

                {/* Progress Bar */}
                {/* Progress Bar */}
                {!isVideoMode && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressTrack}>
                            <View style={styles.progressFill} />
                            <View style={styles.progressThumb} />
                        </View>
                        <View style={styles.progressTimes}>
                            <Text style={styles.progressTime}>1:12</Text>
                            <Text style={styles.progressTime}>{currentItem.duration || '3:45'}</Text>
                        </View>
                    </View>
                )}

                {/* Controls */}
                <View style={styles.controls}>
                    <TouchableOpacity>
                        <Icon name="shuffle" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handlePrevious} style={styles.controlBtn}>
                        <Icon name="skip-back" size={32} color="#FFFFFF" />
                    </TouchableOpacity>
                    {!isVideoMode && (
                        <TouchableOpacity
                            style={styles.mainPlayBtn}
                            onPress={() => setIsPlaying(!isPlaying)}
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
                    <TouchableOpacity onPress={handleNext} style={styles.controlBtn}>
                        <Icon name="skip-forward" size={32} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Icon name="repeat" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                </View>

                {/* Queue Section */}
                {queue.length > 0 && (
                    <View style={styles.queueSection}>
                        <Text style={styles.queueTitle}>Up Next</Text>
                        <View style={styles.queueList}>
                            {queue.map((qItem, idx) => (
                                <TouchableOpacity
                                    key={qItem.id || idx}
                                    style={styles.queueItem}
                                    onPress={() => handlePlayQueueItem(qItem)}
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(2, 6, 23, 0.95)',
    },
    chatOverlay: {
        position: 'absolute',
        top: 64,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 50,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    chatHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    chatAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatAvatarText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    chatTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    chatCloseBtn: {
        padding: 8,
    },
    chatMessages: {
        flex: 1,
    },
    chatMessagesContent: {
        padding: 16,
        gap: 16,
    },
    chatBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
    },
    chatBubbleUser: {
        alignSelf: 'flex-end',
        backgroundColor: '#2563EB',
        borderBottomRightRadius: 4,
    },
    chatBubbleBot: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderBottomLeftRadius: 4,
    },
    chatBubbleText: {
        fontSize: 14,
        color: '#F1F5F9',
    },
    chatInputArea: {
        flexDirection: 'row',
        padding: 16,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    chatInputField: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        color: '#FFFFFF',
    },
    chatSendBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#2563EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
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
    headerBtnActive: {
        backgroundColor: '#2563EB',
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
        width: '33%',
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 3,
    },
    progressThumb: {
        position: 'absolute',
        left: '33%',
        top: -3,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FFFFFF',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
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
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', // Centered
        gap: 24, // Added gap
        paddingHorizontal: 12,
        marginBottom: 48,
    },
    controlBtn: {
        width: 64, // Increased size
        height: 64, // Increased size
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    modeSwitcherContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: -1,
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
