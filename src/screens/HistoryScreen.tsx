import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { GlassCard } from '../components';
import { NavigationProp } from '../types';
import { MOCK_HISTORY, ICON_STYLE } from '../constants';

export const HistoryScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();

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

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {MOCK_HISTORY.map((item) => (
                    <GlassCard key={item.id} style={styles.historyCard}>
                        <View style={styles.historyHeader}>
                            <Text style={styles.moodText}>{item.mood}</Text>
                            <View style={styles.dateBadge}>
                                <Text style={styles.dateText}>{item.date}</Text>
                            </View>
                        </View>
                        <View style={styles.mediaRow}>
                            <Icon name="music" size={14} color="#60A5FA" style={ICON_STYLE} />
                            <Text style={styles.mediaText}>{item.media}</Text>
                        </View>
                    </GlassCard>
                ))}
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
        padding: 16,
        gap: 16,
    },
    historyCard: {
        padding: 20,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    moodText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
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
        fontFamily: 'monospace',
    },
    mediaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    mediaText: {
        fontSize: 14,
        color: '#CBD5E1',
    },
});
