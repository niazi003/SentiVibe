import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import firestore from '@react-native-firebase/firestore';
import { GlassCard } from '../components';
import { NavigationProp } from '../types';
import { AuthContext } from '../context/AuthContext';
import { ICON_STYLE } from '../constants';

interface MoodHistoryItem {
    id: string;
    mood: string;
    source: string;
    detectedAt: any;
}

const MOOD_EMOJI: Record<string, string> = {
    Happy: '😊', Sad: '😢', Angry: '😠', Calm: '😌', Anxious: '😰',
    Excited: '🤩', Lonely: '😔', Focused: '🎯', Romantic: '💕', Neutral: '😐',
};

const MOOD_COLORS: Record<string, string> = {
    Happy: '#4ADE80', Sad: '#60A5FA', Angry: '#F87171', Calm: '#A78BFA',
    Anxious: '#FBBF24', Excited: '#F472B6', Lonely: '#94A3B8', Focused: '#34D399',
    Romantic: '#FB7185', Neutral: '#64748B',
};

const SOURCE_ICONS: Record<string, string> = {
    text: 'type', camera: 'camera', voice: 'mic', chat: 'message-circle',
};

function formatDate(timestamp: any): string {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const HistoryScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const { user } = useContext(AuthContext);
    const [history, setHistory] = useState<MoodHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Real-time Firestore listener
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const unsubscribe = firestore()
            .collection('users')
            .doc(user.uid)
            .collection('moodHistory')
            .orderBy('detectedAt', 'desc')
            .limit(50)
            .onSnapshot(
                snapshot => {
                    const items: MoodHistoryItem[] = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as MoodHistoryItem[];
                    setHistory(items);
                    setLoading(false);
                },
                error => {
                    console.warn('[Firestore] Mood history listener error:', error);
                    setLoading(false);
                },
            );

        return () => unsubscribe();
    }, [user]);

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
                <Text style={styles.headerTitle}>Mood History</Text>
                <View style={styles.placeholder} />
            </View>

            {loading ? (
                <View style={styles.loadingState}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            ) : history.length === 0 ? (
                <View style={styles.emptyState}>
                    <Icon name="clock" size={64} color="rgba(255,255,255,0.15)" />
                    <Text style={styles.emptyText}>No mood history yet</Text>
                    <Text style={styles.emptySubtext}>Your detected moods will appear here</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {history.map((item) => {
                        const emoji = MOOD_EMOJI[item.mood] || '🎭';
                        const color = MOOD_COLORS[item.mood] || '#3B82F6';
                        const sourceIcon = SOURCE_ICONS[item.source] || 'activity';

                        return (
                            <GlassCard key={item.id} style={{...styles.historyCard, borderLeftColor: color}}>
                                <View style={styles.historyHeader}>
                                    <View style={styles.moodRow}>
                                        <Text style={styles.moodEmoji}>{emoji}</Text>
                                        <Text style={[styles.moodText, { color }]}>{item.mood}</Text>
                                    </View>
                                    <View style={styles.dateBadge}>
                                        <Text style={styles.dateText}>{formatDate(item.detectedAt)}</Text>
                                    </View>
                                </View>
                                <View style={styles.sourceRow}>
                                    <Icon name={sourceIcon} size={14} color="#64748B" style={ICON_STYLE} />
                                    <Text style={styles.sourceText}>
                                        Detected via {item.source}
                                    </Text>
                                </View>
                            </GlassCard>
                        );
                    })}
                </ScrollView>
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
        padding: 16,
        gap: 12,
    },
    historyCard: {
        padding: 16,
        borderRadius: 16,
        borderLeftWidth: 4,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    moodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    moodEmoji: {
        fontSize: 22,
    },
    moodText: {
        fontSize: 18,
        fontWeight: '700',
    },
    dateBadge: {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    dateText: {
        fontSize: 12,
        color: '#64748B',
    },
    sourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sourceText: {
        fontSize: 13,
        color: '#64748B',
        textTransform: 'capitalize',
    },
    loadingState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#94A3B8',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#64748B',
    },
});
