import React, { useState, useEffect, useRef, useContext } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Platform,
    ScrollView,
    ImageBackground,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { GlassCard } from '../components';
import { NavigationProp, RootStackParamList, ChatMessage } from '../types';
import { AppContext } from '../context/AppContext';
import { ICON_STYLE } from '../constants';
import { sendChatMessage, detectTextEmotion } from '../services/api';
import { saveMoodToFirestore } from '../services/firestorePreferences';

type ChatbotRouteProp = RouteProp<RootStackParamList, 'Chatbot'>;

export const ChatbotScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<ChatbotRouteProp>();
    const params = route.params;

    const { userData, chatHistory, setChatHistory, resetChat } = useContext(AppContext);

    const [input, setInput] = useState('');
    const [detectedMood, setDetectedMood] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    const scrollToBottom = () => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory]);

    // Handle Reset Request
    useEffect(() => {
        if (params?.reset) {
            resetChat();
            setDetectedMood(null);
            setInput('');
        }
    }, [params?.reset]);

    // Handle detection results
    useEffect(() => {
        if (params?.detectedEmotion) {
            if (detectedMood !== params.detectedEmotion || params.backToChoices) {
                setDetectedMood(params.detectedEmotion);
                saveMoodToFirestore(params.detectedEmotion, 'camera');
                const emojiMap: Record<string, string> = {
                    Happy: '😊', Sad: '😢', Angry: '😠', Calm: '😌', Anxious: '😰',
                    Excited: '🤩', Lonely: '😔', Focused: '🎯', Romantic: '💕', Neutral: '😐'
                };
                const emotionEmoji = emojiMap[params.detectedEmotion] || '🎭';

                const resultMsg: ChatMessage = {
                    id: Date.now(),
                    text: `I've analyzed your input. You seem to be feeling ${params.detectedEmotion} ${emotionEmoji}.`,
                    sender: 'bot',
                    isResult: true,
                    showFeedback: true
                };
                const questionMsg: ChatMessage = {
                    id: Date.now() + 1,
                    text: `What would you like to do now?`,
                    sender: 'bot',
                    isChoice: true
                };

                setChatHistory(prev => [...prev, resultMsg]);

                setTimeout(() => {
                    setChatHistory(prev => [...prev, questionMsg]);
                }, 800);
            }
        }
    }, [params?.detectedEmotion, params?.backToChoices]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const userText = input.trim();

        const newMsg: ChatMessage = { id: Date.now(), text: userText, sender: 'user' };
        setChatHistory(prev => [...prev, newMsg]);
        setInput('');
        setIsLoading(true);

        // Show typing indicator
        const typingMsg: ChatMessage = { id: Date.now() + 1, text: '...', sender: 'bot' };
        setChatHistory(prev => [...prev, typingMsg]);

        try {
            // Use the real AI chatbot (LLaMA 3 + RAG)
            const userId = userData?.email || userData?.name || 'default_user';
            const aiResponse = await sendChatMessage(userId, userText);

            // Remove typing indicator and add real AI reply
            setChatHistory(prev => {
                const filtered = prev.filter(m => m.id !== typingMsg.id);
                const replyMsg: ChatMessage = {
                    id: Date.now() + 2,
                    text: aiResponse.reply,
                    sender: 'bot'
                };
                return [...filtered, replyMsg];
            });

            // Use the AI-detected emotion to show mood result
            if (aiResponse.detectedEmotion && aiResponse.detectedEmotion !== 'neutral') {
                const emotion = aiResponse.detectedEmotion.charAt(0).toUpperCase() + aiResponse.detectedEmotion.slice(1);
                navigation.setParams({ detectedEmotion: emotion });
                saveMoodToFirestore(emotion, 'chat');
            }
        } catch (error: any) {
            console.warn('[Chat] AI error, falling back to text detection:', error.message);

            // Fallback: try the standalone text emotion detection
            try {
                const detection = await detectTextEmotion(userText);
                setChatHistory(prev => {
                    const filtered = prev.filter(m => m.id !== typingMsg.id);
                    const fallbackReply: ChatMessage = {
                        id: Date.now() + 2,
                        text: `I sense you're feeling ${detection.emotion}. Tell me more about what's going on?`,
                        sender: 'bot'
                    };
                    return [...filtered, fallbackReply];
                });
                const emotion = detection.emotion.charAt(0).toUpperCase() + detection.emotion.slice(1);
                navigation.setParams({ detectedEmotion: emotion });
                saveMoodToFirestore(emotion, 'text');
            } catch {
                // Final fallback: local heuristic
                setChatHistory(prev => {
                    const filtered = prev.filter(m => m.id !== typingMsg.id);
                    const errorReply: ChatMessage = {
                        id: Date.now() + 2,
                        text: "I'm having trouble connecting to my brain right now 🤖 But I'm still here — try the camera or voice option instead!",
                        sender: 'bot'
                    };
                    return [...filtered, errorReply];
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleMethodSelect = (method: 'camera' | 'voice') => {
        navigation.navigate('Detection', { mode: method });
    };

    const handleMediaChoice = (type: 'Music' | 'Video' | 'Movie') => {
        navigation.navigate('Results', { emotion: detectedMood || 'Happy', initialTab: type });
    };

    const mediaOptions = [
        { id: 'Music' as const, icon: 'music', color: '#1DB954', label: 'Listen to Music', sub: 'Spotify Playlists' },
        { id: 'Video' as const, icon: 'youtube', color: '#EF4444', label: 'Music Videos', sub: 'Watch the Vibe' },
        { id: 'Movie' as const, icon: 'film', color: '#A855F7', label: 'Find a Movie', sub: 'Curated Films' }
    ];

    return (
        <ImageBackground
            source={require('../images/wallpaper.jpg')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <View style={styles.overlay} />
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <LinearGradient
                            colors={['#2563EB', '#4F46E5']}
                            style={styles.avatar}
                        >
                            <Text style={styles.avatarText}>S</Text>
                        </LinearGradient>
                        <View>
                            <Text style={styles.headerTitle}>Sentivibe</Text>
                            <View style={styles.onlineStatus}>
                                <View style={styles.onlineDot} />
                                <Text style={styles.onlineText}>Online</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={() => navigation.navigate('Favorites')}
                        >
                            <Icon name="heart" size={20} color="#CBD5E1" style={ICON_STYLE} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={() => navigation.navigate('History')}
                        >
                            <Icon name="clock" size={20} color="#CBD5E1" style={ICON_STYLE} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={() => navigation.navigate('Profile')}
                        >
                            <Icon name="user" size={20} color="#CBD5E1" style={ICON_STYLE} />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView
                    ref={scrollViewRef}
                    style={styles.chatArea}
                    contentContainerStyle={styles.chatContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {chatHistory.map((msg) => (
                        <View key={msg.id} style={[styles.messageRow, msg.sender === 'user' && styles.messageRowUser]}>
                            {msg.isResult ? (
                                <View style={styles.resultCard}>
                                    <View style={styles.resultHeader}>
                                        <View style={styles.resultIcon}>
                                            <Icon name="star" size={18} color="#60A5FA" />
                                        </View>
                                        <Text style={styles.resultTitle}>Mood Detected</Text>
                                    </View>
                                    <Text style={styles.resultText}>{msg.text}</Text>

                                    {msg.showFeedback && (
                                        <View style={styles.feedbackRow}>
                                            <Text style={styles.feedbackLabel}>Feedback:</Text>
                                            <TouchableOpacity style={styles.feedbackBtn}>
                                                <Icon name="thumbs-up" size={14} color="#94A3B8" />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.feedbackBtn}>
                                                <Icon name="thumbs-down" size={14} color="#94A3B8" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <View style={[
                                    styles.messageBubble,
                                    msg.sender === 'user' ? styles.userBubble : styles.botBubble
                                ]}>
                                    <Text style={styles.messageText}>{msg.text}</Text>
                                </View>
                            )}

                            {msg.isChoice && (
                                <View style={styles.choicesContainer}>
                                    {mediaOptions.map((opt) => (
                                        <GlassCard key={opt.id} style={styles.choiceCard}>
                                            <TouchableOpacity
                                                style={styles.choiceButton}
                                                onPress={() => handleMediaChoice(opt.id)}
                                            >
                                                <View style={[styles.choiceIcon, { backgroundColor: `${opt.color}20` }]}>
                                                    <Icon name={opt.icon} size={24} color={opt.color} />
                                                </View>
                                                <View style={styles.choiceInfo}>
                                                    <Text style={styles.choiceLabel}>{opt.label}</Text>
                                                    <Text style={styles.choiceSub}>{opt.sub}</Text>
                                                </View>
                                                <Icon name="arrow-right" size={20} color="#475569" />
                                            </TouchableOpacity>
                                        </GlassCard>
                                    ))}
                                </View>
                            )}
                        </View>
                    ))}
                </ScrollView>

                {/* Input Area */}
                <View style={styles.inputArea}>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            value={input}
                            onChangeText={setInput}
                            placeholder="Message..."
                            placeholderTextColor="#64748B"
                            onSubmitEditing={handleSend}
                        />
                        <View style={styles.inputButtons}>
                            <TouchableOpacity
                                style={styles.inputBtn}
                                onPress={() => handleMethodSelect('camera')}
                            >
                                <Icon name="camera" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.sendBtn,
                                    input.trim() ? styles.sendBtnActive : styles.sendBtnInactive
                                ]}
                                onPress={input.trim() ? handleSend : () => handleMethodSelect('voice')}
                                disabled={isLoading}
                            >
                                <Icon
                                    name={input.trim() ? 'send' : 'mic'}
                                    size={20}
                                    color={input.trim() ? '#FFFFFF' : '#94A3B8'}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(2, 6, 23, 0.6)',
    },
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: -0.3,
    },
    onlineStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4ADE80',
        shadowColor: '#4ADE80',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
    },
    onlineText: {
        fontSize: 12,
        color: '#4ADE80',
        fontWeight: '500',
    },
    headerRight: {
        flexDirection: 'row',
        gap: 8,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatArea: {
        flex: 1,
    },
    chatContent: {
        padding: 16,
        gap: 24,
    },
    messageRow: {
        alignItems: 'flex-start',
    },
    messageRowUser: {
        alignItems: 'flex-end',
    },
    messageBubble: {
        maxWidth: '85%',
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    userBubble: {
        backgroundColor: '#2563EB',
        borderBottomRightRadius: 4,
    },
    botBubble: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    messageText: {
        fontSize: 15,
        color: '#F1F5F9',
        lineHeight: 22,
    },
    resultCard: {
        width: '90%',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.3)',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#1E3A8A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 5,
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    resultIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    resultText: {
        fontSize: 15,
        color: '#CBD5E1',
        lineHeight: 22,
        fontWeight: '300',
    },
    feedbackRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    feedbackLabel: {
        fontSize: 12,
        color: '#64748B',
    },
    feedbackBtn: {
        padding: 4,
    },
    choicesContainer: {
        width: '100%',
        gap: 12,
        marginTop: 16,
    },
    choiceCard: {
        borderRadius: 12,
        overflow: 'hidden',
        borderColor: 'transparent',
    },
    choiceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    choiceIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    choiceInfo: {
        flex: 1,
    },
    choiceLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    choiceSub: {
        fontSize: 12,
        color: '#94A3B8',
    },
    inputArea: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        marginBottom: 2,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 14,
        fontSize: 16,
        color: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    inputButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    inputBtn: {
        padding: 12,
    },
    sendBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    sendBtnActive: {
        backgroundColor: '#2563EB',
    },
    sendBtnInactive: {
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
    },
});
