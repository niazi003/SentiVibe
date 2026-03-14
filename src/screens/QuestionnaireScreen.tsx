import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { GlassCard } from '../components';
import { NavigationProp } from '../types';

interface Question {
    id: string;
    emoji: string;
    title: string;
    subtitle: string;
    options: string[];
}

const QUESTIONS: Question[] = [
    {
        id: 'genre_preference',
        emoji: '🎵',
        title: "Let's find your rhythm.",
        subtitle: "Which genre usually speaks to your soul?",
        options: [
            "Pop & Top 40 Hits",
            "Hip-Hop, Rap & R&B",
            "Rock, Alternative & Indie",
            "Electronic (EDM, House, Techno)",
            "Lo-Fi, Jazz & Classical (Chill)",
            "Country & Folk"
        ]
    },
    {
        id: 'happy_preference',
        emoji: '✨',
        title: "You're walking on sunshine!☀️",
        subtitle: "When you're happy, what kind of vibe do you want?",
        options: [
            "Party Mode (High Energy Dance)",
            "Sing-along Classics (Nostalgia)",
            "Chill & Sunny (Good Vibes)",
            "Motivational Anthems (Feeling Unstoppable)"
        ]
    },
    {
        id: 'sad_preference',
        emoji: '🌧️',
        title: "Feeling a bit blue...",
        subtitle: "When you're sad, how should we handle it?",
        options: [
            "Deep & Melancholic Songs (Let it out)",
            "Upbeat & Happy Pop (Cheer me up)",
            "Comfort Movies (Distract me)",
            "Gentle Instrumentals (Calm me down)"
        ]
    },
    {
        id: 'excited_preference',
        emoji: '⚡',
        title: "The hype is real!",
        subtitle: "You're excited! What keeps that energy flowing?",
        options: [
            "Fast-Paced Rap & Trap",
            "Heavy Metal or Hard Rock",
            "High-Tempo EDM & Bass",
            "Epic Movie Soundtracks"
        ]
    },
    {
        id: 'movie_preference',
        emoji: '🍿',
        title: "Movie Night Essentials",
        subtitle: "If we suggest a film, what's your go-to genre?",
        options: [
            "Comedy (I need a laugh)",
            "Action/Adventure (Thrills only)",
            "Drama/Romance (All the feels)",
            "Sci-Fi/Fantasy (Escape reality)"
        ]
    }
];

export const QuestionnaireScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const [step, setStep] = useState(0);
    const [, setPreferences] = useState<Record<string, string>>({});

    const handleSelect = (option: string) => {
        const currentQ = QUESTIONS[step];
        setPreferences(prev => ({ ...prev, [currentQ.id]: option }));

        if (step < QUESTIONS.length - 1) {
            setStep(step + 1);
        } else {
            navigation.navigate('Chatbot');
        }
    };

    const currentQuestion = QUESTIONS[step];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <LinearGradient
                    colors={['#60A5FA', '#A78BFA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.headerGradient}
                >
                    <Text style={styles.headerTitle}>Let's Tune Your Vibe 🌊</Text>
                </LinearGradient>
                <Text style={styles.headerSubtitle}>
                    Tell us what moves you. We'll customize your chatbot personality and curate songs specially for your unique emotional fingerprint.
                </Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                {QUESTIONS.map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.progressBar,
                            i <= step && styles.progressBarActive
                        ]}
                    />
                ))}
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.emoji}>{currentQuestion.emoji}</Text>
                <Text style={styles.questionTitle}>{currentQuestion.title}</Text>
                <Text style={styles.questionSubtitle}>{currentQuestion.subtitle}</Text>

                <View style={styles.options}>
                    {currentQuestion.options.map((option) => (
                        <GlassCard key={option} style={styles.optionCard}>
                            <TouchableOpacity
                                style={styles.optionButton}
                                onPress={() => handleSelect(option)}
                            >
                                <Text style={styles.optionText}>{option}</Text>
                                <Icon name="chevron-right" size={16} color="#475569" />
                            </TouchableOpacity>
                        </GlassCard>
                    ))}
                </View>
            </ScrollView>

            <TouchableOpacity
                style={styles.skipButton}
                onPress={() => navigation.navigate('Chatbot')}
            >
                <Text style={styles.skipText}>Skip customization for now</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
        paddingTop: 32,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
        paddingHorizontal: 24,
    },
    headerGradient: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '300',
        lineHeight: 18,
        textAlign: 'center',
        paddingHorizontal: 16,
    },
    progressContainer: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    progressBar: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#1E293B',
    },
    progressBarActive: {
        backgroundColor: '#3B82F6',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 24,
        alignItems: 'center',
        paddingBottom: 16,
    },
    emoji: {
        fontSize: 64,
        marginBottom: 24,
    },
    questionTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 8,
    },
    questionSubtitle: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        marginBottom: 32,
    },
    options: {
        width: '100%',
        gap: 10,
    },
    optionCard: {
        borderRadius: 12,
        overflow: 'hidden',
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    optionButton: {
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    optionText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#CBD5E1',
        flex: 1,
    },
    skipButton: {
        padding: 16,
        alignItems: 'center',
    },
    skipText: {
        fontSize: 12,
        color: '#64748B',
    },
});
