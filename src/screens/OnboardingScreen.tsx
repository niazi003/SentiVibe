/**
 * OnboardingScreen — Personalization Setup Wizard
 *
 * 4-step wizard that collects user music preferences:
 *   Step 1: Genre selection (multi-select chips)
 *   Step 2: Favorite artists (text inputs, optional)
 *   Step 3: Energy preferences per mood (toggle)
 *   Step 4: Language preference (radio buttons)
 *
 * Results are POSTed to /api/user/preferences.
 * Shown after first Spotify login (when onboardingComplete is false).
 * Can be re-opened from Settings for preference updates.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { GlassCard } from '../components';
import { NavigationProp, RootStackParamList } from '../types';
import { saveUserPreferences } from '../services/api';
import { ICON_STYLE } from '../constants';

const TOTAL_STEPS = 4;

// ── Genre chips ─────────────────────────────────────────────────
const GENRE_OPTIONS = [
    { label: 'Pop', emoji: '🎤' },
    { label: 'Hip-Hop', emoji: '🎧' },
    { label: 'R&B', emoji: '🎶' },
    { label: 'Rock', emoji: '🎸' },
    { label: 'EDM', emoji: '⚡' },
    { label: 'Classical', emoji: '🎻' },
    { label: 'Jazz', emoji: '🎷' },
    { label: 'Lo-Fi', emoji: '🌙' },
    { label: 'K-Pop', emoji: '🇰🇷' },
    { label: 'Punjabi/Desi', emoji: '🪘' },
    { label: 'Urdu/Hindi', emoji: '🎵' },
    { label: 'Latin', emoji: '💃' },
    { label: 'Metal', emoji: '🤘' },
];

// ── Energy mood toggles ──────────────────────────────────────────
const ENERGY_MOODS = [
    {
        mood: 'angry',
        emoji: '😡',
        label: 'Angry',
        optionA: 'Loud & Heavy',
        optionB: 'Calm it down',
        valueA: 'high',
        valueB: 'low',
    },
    {
        mood: 'sad',
        emoji: '😢',
        label: 'Sad',
        optionA: 'Let it out',
        optionB: 'Uplift me',
        valueA: 'low',
        valueB: 'high',
    },
    {
        mood: 'calm',
        emoji: '😌',
        label: 'Calm',
        optionA: 'Keep it chill',
        optionB: 'Light & happy',
        valueA: 'low',
        valueB: 'medium',
    },
];

// ── Language options ──────────────────────────────────────────────
const LANGUAGE_OPTIONS = [
    { label: 'English', value: 'english' },
    { label: 'Urdu + Hindi', value: 'urdu+hindi' },
    { label: 'Mix of Both', value: 'mix' },
    { label: 'No Preference', value: 'no preference' },
];

export const OnboardingScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<RouteProp<RootStackParamList, 'Onboarding'>>();
    const isUpdate = route.params?.isUpdate ?? false;

    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);

    // Step 1: genres
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

    // Step 2: artists
    const [artist1, setArtist1] = useState('');
    const [artist2, setArtist2] = useState('');
    const [artist3, setArtist3] = useState('');

    // Step 3: energy per mood
    const [energyPrefs, setEnergyPrefs] = useState<Record<string, string>>({
        angry: 'high',
        sad: 'low',
        calm: 'low',
    });

    // Step 4: language
    const [language, setLanguage] = useState('no preference');

    // ── Genre toggle ──────────────────────────────────────────────
    const toggleGenre = useCallback((genre: string) => {
        setSelectedGenres(prev => {
            if (prev.includes(genre)) {
                return prev.filter(g => g !== genre);
            }
            if (prev.length >= 5) return prev; // max 5
            return [...prev, genre];
        });
    }, []);

    // ── Navigation ────────────────────────────────────────────────
    const goNext = () => {
        if (step < TOTAL_STEPS - 1) {
            setStep(step + 1);
        } else {
            handleSave();
        }
    };

    const goBack = () => {
        if (step > 0) {
            setStep(step - 1);
        } else if (isUpdate) {
            navigation.goBack();
        }
    };

    const handleSkip = () => {
        if (step < TOTAL_STEPS - 1) {
            setStep(step + 1);
        } else {
            handleSave();
        }
    };

    const handleSkipAll = async () => {
        // Save minimal/empty prefs and go to main
        setSaving(true);
        try {
            await saveUserPreferences({
                genres: [],
                favoriteArtists: [],
                energyPreference: {},
                languagePreference: 'no preference',
            });
        } catch {}
        setSaving(false);
        navigateToMain();
    };

    const navigateToMain = () => {
        if (isUpdate) {
            navigation.goBack();
        } else {
            navigation.navigate('Chatbot');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const artists = [artist1, artist2, artist3]
                .map(a => a.trim())
                .filter(a => a.length > 0);

            const result = await saveUserPreferences({
                genres: selectedGenres.map(g => g.toLowerCase()),
                favoriteArtists: artists,
                energyPreference: energyPrefs,
                languagePreference: language,
            });

            if (result.success) {
                navigateToMain();
            } else {
                Alert.alert('Oops', 'Could not save preferences. Please try again.');
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to save preferences.');
        }
        setSaving(false);
    };

    // ── Step renderers ────────────────────────────────────────────
    const renderGenreStep = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>🎵</Text>
            <Text style={styles.stepTitle}>What genres do you love?</Text>
            <Text style={styles.stepSubtitle}>Pick up to 5 that match your vibe</Text>

            <View style={styles.chipGrid}>
                {GENRE_OPTIONS.map(({ label, emoji }) => {
                    const selected = selectedGenres.includes(label);
                    return (
                        <TouchableOpacity
                            key={label}
                            onPress={() => toggleGenre(label)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.chip, selected && styles.chipSelected]}>
                                <Text style={styles.chipEmoji}>{emoji}</Text>
                                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                                    {label}
                                </Text>
                                {selected && (
                                    <Icon name="check" size={14} color="#3B82F6" style={ICON_STYLE} />
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <Text style={styles.counter}>
                {selectedGenres.length}/5 selected
            </Text>
        </View>
    );

    const renderArtistStep = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>🎤</Text>
            <Text style={styles.stepTitle}>Name your favorite artists</Text>
            <Text style={styles.stepSubtitle}>Up to 3 artists (optional — skip if unsure)</Text>

            <View style={styles.inputContainer}>
                <GlassCard style={styles.inputCard}>
                    <TextInput
                        style={styles.textInput}
                        value={artist1}
                        onChangeText={setArtist1}
                        placeholder="Artist 1 (e.g. Drake)"
                        placeholderTextColor="#475569"
                        autoCapitalize="words"
                    />
                </GlassCard>
                <GlassCard style={styles.inputCard}>
                    <TextInput
                        style={styles.textInput}
                        value={artist2}
                        onChangeText={setArtist2}
                        placeholder="Artist 2 (e.g. Taylor Swift)"
                        placeholderTextColor="#475569"
                        autoCapitalize="words"
                    />
                </GlassCard>
                <GlassCard style={styles.inputCard}>
                    <TextInput
                        style={styles.textInput}
                        value={artist3}
                        onChangeText={setArtist3}
                        placeholder="Artist 3 (e.g. The Weeknd)"
                        placeholderTextColor="#475569"
                        autoCapitalize="words"
                    />
                </GlassCard>
            </View>
        </View>
    );

    const renderEnergyStep = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>⚡</Text>
            <Text style={styles.stepTitle}>How do you like your music?</Text>
            <Text style={styles.stepSubtitle}>Choose your energy vibe for each mood</Text>

            <View style={styles.toggleContainer}>
                {ENERGY_MOODS.map(({ mood, emoji, label, optionA, optionB, valueA, valueB }) => {
                    const currentValue = energyPrefs[mood] || valueA;
                    const isA = currentValue === valueA;

                    return (
                        <GlassCard key={mood} style={styles.toggleCard}>
                            <View style={styles.toggleHeader}>
                                <Text style={styles.toggleEmoji}>{emoji}</Text>
                                <Text style={styles.toggleLabel}>{label}</Text>
                            </View>
                            <View style={styles.toggleRow}>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, isA && styles.toggleBtnActive]}
                                    onPress={() => setEnergyPrefs(p => ({ ...p, [mood]: valueA }))}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.toggleBtnText, isA && styles.toggleBtnTextActive]}>
                                        {optionA}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, !isA && styles.toggleBtnActive]}
                                    onPress={() => setEnergyPrefs(p => ({ ...p, [mood]: valueB }))}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.toggleBtnText, !isA && styles.toggleBtnTextActive]}>
                                        {optionB}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </GlassCard>
                    );
                })}
            </View>
        </View>
    );

    const renderLanguageStep = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>🌍</Text>
            <Text style={styles.stepTitle}>Language preference?</Text>
            <Text style={styles.stepSubtitle}>What language should your songs be in?</Text>

            <View style={styles.radioContainer}>
                {LANGUAGE_OPTIONS.map(({ label, value }) => {
                    const selected = language === value;
                    return (
                        <TouchableOpacity
                            key={value}
                            onPress={() => setLanguage(value)}
                            activeOpacity={0.7}
                        >
                            <GlassCard style={selected ? { ...styles.radioCard, ...styles.radioCardSelected } : styles.radioCard}>
                                <View style={styles.radioRow}>
                                    <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
                                        {selected && <View style={styles.radioInner} />}
                                    </View>
                                    <Text style={[styles.radioText, selected && styles.radioTextSelected]}>
                                        {label}
                                    </Text>
                                </View>
                            </GlassCard>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    const STEPS = [renderGenreStep, renderArtistStep, renderEnergyStep, renderLanguageStep];
    const isLastStep = step === TOTAL_STEPS - 1;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                {step > 0 || isUpdate ? (
                    <TouchableOpacity style={styles.backBtn} onPress={goBack}>
                        <Icon name="arrow-left" size={22} color="#94A3B8" style={ICON_STYLE} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.backBtn} />
                )}

                <LinearGradient
                    colors={['#60A5FA', '#A78BFA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.headerPill}
                >
                    <Text style={styles.headerPillText}>
                        {isUpdate ? '✏️ Update Preferences' : '🎵 Personalize Your Vibe'}
                    </Text>
                </LinearGradient>

                <View style={styles.backBtn} />
            </View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.progressBar,
                            i <= step && styles.progressBarActive,
                        ]}
                    />
                ))}
            </View>
            <Text style={styles.progressLabel}>Step {step + 1} of {TOTAL_STEPS}</Text>

            {/* Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {STEPS[step]()}
            </ScrollView>

            {/* Bottom buttons */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={styles.skipBtn}
                    onPress={isLastStep ? handleSkipAll : handleSkip}
                >
                    <Text style={styles.skipBtnText}>
                        {isLastStep ? 'Skip for now' : 'Skip this step'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={goNext} activeOpacity={0.8} disabled={saving}>
                    <LinearGradient
                        colors={isLastStep ? ['#10B981', '#059669'] : ['#2563EB', '#4F46E5']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.nextBtn}
                    >
                        <Text style={styles.nextBtnText}>
                            {saving
                                ? 'Saving...'
                                : isLastStep
                                    ? "Let's Go 🎵"
                                    : 'Next'}
                        </Text>
                        {!isLastStep && !saving && (
                            <Icon name="arrow-right" size={18} color="#FFF" style={ICON_STYLE} />
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

// ── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    headerPillText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    progressContainer: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 24,
        marginBottom: 4,
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
    progressLabel: {
        textAlign: 'center',
        fontSize: 12,
        color: '#64748B',
        marginBottom: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    stepContent: {
        alignItems: 'center',
    },
    stepEmoji: {
        fontSize: 56,
        marginBottom: 16,
        marginTop: 8,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 6,
    },
    stepSubtitle: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        marginBottom: 28,
    },

    // ── Genre chips ──
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
        width: '100%',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    chipSelected: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderColor: '#3B82F6',
    },
    chipEmoji: {
        fontSize: 16,
    },
    chipText: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '500',
    },
    chipTextSelected: {
        color: '#60A5FA',
        fontWeight: '600',
    },
    counter: {
        marginTop: 16,
        fontSize: 13,
        color: '#64748B',
    },

    // ── Artist inputs ──
    inputContainer: {
        width: '100%',
        gap: 14,
    },
    inputCard: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    textInput: {
        padding: 16,
        fontSize: 16,
        color: '#FFFFFF',
    },

    // ── Energy toggles ──
    toggleContainer: {
        width: '100%',
        gap: 14,
    },
    toggleCard: {
        borderRadius: 16,
        padding: 16,
    },
    toggleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    toggleEmoji: {
        fontSize: 24,
    },
    toggleLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    toggleRow: {
        flexDirection: 'row',
        gap: 10,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
    },
    toggleBtnActive: {
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3B82F6',
    },
    toggleBtnText: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '500',
    },
    toggleBtnTextActive: {
        color: '#60A5FA',
        fontWeight: '700',
    },

    // ── Language radio ──
    radioContainer: {
        width: '100%',
        gap: 12,
    },
    radioCard: {
        borderRadius: 14,
        padding: 16,
    },
    radioCardSelected: {
        borderColor: '#3B82F6',
    },
    radioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    radioCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#475569',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioCircleSelected: {
        borderColor: '#3B82F6',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#3B82F6',
    },
    radioText: {
        fontSize: 16,
        color: '#94A3B8',
        fontWeight: '500',
    },
    radioTextSelected: {
        color: '#FFFFFF',
        fontWeight: '600',
    },

    // ── Bottom bar ──
    bottomBar: {
        paddingHorizontal: 24,
        paddingBottom: 16,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        gap: 10,
    },
    skipBtn: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    skipBtnText: {
        fontSize: 13,
        color: '#64748B',
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 14,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    nextBtnText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
