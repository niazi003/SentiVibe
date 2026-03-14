import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { AppContext } from '../context/AppContext';
import { NavigationProp, MediaItem } from '../types';
import { GlassCard, YouTubePlayer, extractYouTubeId } from '../components';
import { ICON_STYLE } from '../constants';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const FavoritesScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const { favorites, toggleFavorite, isFavorite } = useContext(AppContext);
    const [activeTab, setActiveTab] = useState<'Music' | 'Movie'>('Music');
    const [expandedTrailerId, setExpandedTrailerId] = useState<number | null>(null);

    const musicFavorites = favorites.filter(item => item.type === 'Music' || item.type === 'Video' || (!item.type && !item.trailer));
    const movieFavorites = favorites.filter(item => item.type === 'Movie' || (!item.type && item.trailer));

    const currentData = activeTab === 'Music' ? musicFavorites : movieFavorites;

    const toggleTrailer = (itemId: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedTrailerId(expandedTrailerId === itemId ? null : itemId);
    };

    const handlePlay = (item: MediaItem) => {
        navigation.navigate('Player', {
            item,
            queue: currentData,
            type: activeTab
        });
    };

    const renderItem = ({ item }: { item: MediaItem }) => {
        if (activeTab === 'Movie') {
            return (
                <GlassCard style={styles.movieCardContainer}>
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
                                        onPress={() => toggleFavorite(item)}
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
                </GlassCard>
            );
        }

        return (
            <TouchableOpacity
                style={styles.itemCard}
                onPress={() => handlePlay(item)}
            >
                <Image source={{ uri: item.cover }} style={styles.itemCover} />
                <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.itemArtist} numberOfLines={1}>{item.artist}</Text>
                </View>
                <TouchableOpacity
                    style={styles.favBtn}
                    onPress={() => toggleFavorite(item)}
                >
                    <Icon name="heart" size={20} color="#EF4444" />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Icon name="arrow-left" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Favorites</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'Music' && styles.activeTab]}
                    onPress={() => setActiveTab('Music')}
                >
                    <Text style={[styles.tabText, activeTab === 'Music' && styles.activeTabText]}>Music</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'Movie' && styles.activeTab]}
                    onPress={() => setActiveTab('Movie')}
                >
                    <Text style={[styles.tabText, activeTab === 'Movie' && styles.activeTabText]}>Movies</Text>
                </TouchableOpacity>
            </View>

            {currentData.length === 0 ? (
                <View style={styles.emptyState}>
                    <Icon name="heart" size={64} color="rgba(255,255,255,0.2)" />
                    <Text style={styles.emptyText}>No favorites yet</Text>
                </View>
            ) : (
                <FlatList
                    data={currentData}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                />
            )}
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
        padding: 20,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    listContent: {
        padding: 20,
        gap: 16,
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    itemCover: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#1E293B',
    },
    itemInfo: {
        flex: 1,
        marginLeft: 16,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    itemArtist: {
        fontSize: 14,
        color: '#94A3B8',
    },
    favBtn: {
        padding: 8,
    },
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
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 12,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    activeTab: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94A3B8',
    },
    activeTabText: {
        color: '#FFFFFF',
    },
    // Movie Card Styles
    movieCardContainer: {
        borderRadius: 16,
        borderColor: 'transparent',
    },
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
    trailerContainer: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    movieFavBtn: {
        padding: 4,
    },
});
