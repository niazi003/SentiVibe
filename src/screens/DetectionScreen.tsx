import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Easing,
    TouchableOpacity,
    Platform,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { NavigationProp, RootStackParamList } from '../types';
import { detectFaceEmotion, transcribeVoice } from '../services/api';
import { mapDetectorEmotionToAppLabel } from '../utils/emotionLabels';
import {
    captureFaceFromCamera,
    pickFaceFromLibrary,
    ensureAndroidMicPermission,
    toFileUri,
    guessVoiceUploadMeta,
    startVoiceRecording,
    stopVoiceRecording,
    discardVoiceRecording,
} from '../services/emotionMedia';

type DetectionRouteProp = RouteProp<RootStackParamList, 'Detection'>;

type Phase = 'pick' | 'analyzing';

export const DetectionScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<DetectionRouteProp>();
    const { mode } = route.params;

    const [phase, setPhase] = useState<Phase>('pick');
    const [status, setStatus] = useState('Initializing...');
    const [progress, setProgress] = useState(0);
    const [isRecording, setIsRecording] = useState(false);

    const spinValue = useRef(new Animated.Value(0)).current;
    const spinValueReverse = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const spinAnimation = Animated.loop(
            Animated.timing(spinValue, {
                toValue: 1,
                duration: 2500,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        const spinReverseAnimation = Animated.loop(
            Animated.timing(spinValueReverse, {
                toValue: 1,
                duration: 2000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        spinAnimation.start();
        spinReverseAnimation.start();
        return () => {
            spinAnimation.stop();
            spinReverseAnimation.stop();
        };
    }, [spinValue, spinValueReverse]);

    useEffect(() => {
        return () => {
            void discardVoiceRecording();
        };
    }, []);

    const goToChatWithEmotion = useCallback(
        (rawEmotion: string) => {
            const label = mapDetectorEmotionToAppLabel(rawEmotion);
            navigation.navigate('Chatbot', { detectedEmotion: label });
        },
        [navigation]
    );

    const runFacePipeline = useCallback(
        async (imageBase64: string) => {
            setPhase('analyzing');
            setStatus('Analyzing facial expression...');
            setProgress(35);
            const result = await detectFaceEmotion(imageBase64);
            setProgress(100);
            goToChatWithEmotion(result.emotion);
        },
        [goToChatWithEmotion]
    );

    const runVoicePipeline = useCallback(
        async (localPath: string) => {
            setPhase('analyzing');
            setStatus('Transcribing your voice...');
            setProgress(30);
            const uri = toFileUri(localPath);
            const { fileName, mimeType } = guessVoiceUploadMeta(localPath);
            const result = await transcribeVoice(uri, fileName, mimeType);
            setProgress(100);
            // Navigate to Chatbot with the transcript so it goes straight into the AI chat
            navigation.navigate('Chatbot', { voiceTranscript: result.transcript });
        },
        [navigation]
    );

    const onTakePhoto = useCallback(async () => {
        try {
            const b64 = await captureFaceFromCamera();
            if (!b64) {
                return;
            }
            await runFacePipeline(b64);
        } catch (e) {
            console.error('[Detection] face camera:', e);
            Alert.alert('Face detection failed', (e as Error).message || 'Please try again.');
            navigation.navigate('EmotionError');
        }
    }, [navigation, runFacePipeline]);

    const onPickGallery = useCallback(async () => {
        try {
            const b64 = await pickFaceFromLibrary();
            if (!b64) {
                return;
            }
            await runFacePipeline(b64);
        } catch (e) {
            console.error('[Detection] face gallery:', e);
            Alert.alert('Face detection failed', (e as Error).message || 'Please try again.');
            navigation.navigate('EmotionError');
        }
    }, [navigation, runFacePipeline]);

    const onToggleVoiceRecord = useCallback(async () => {
        if (!isRecording) {
            const ok = await ensureAndroidMicPermission();
            if (!ok) {
                return;
            }
            try {
                await startVoiceRecording();
                setIsRecording(true);
            } catch (e) {
                console.error('[Detection] record start:', e);
                Alert.alert('Recording failed', (e as Error).message || 'Could not start microphone.');
            }
            return;
        }

        setIsRecording(false);
        try {
            const path = await stopVoiceRecording();
            if (!path?.trim()) {
                Alert.alert('No audio captured', 'Record for at least a second, then tap stop again.');
                return;
            }
            await runVoicePipeline(path);
        } catch (e) {
            console.error('[Detection] voice:', e);
            Alert.alert('Voice detection failed', (e as Error).message || 'Please try again.');
            navigation.navigate('EmotionError');
        }
    }, [isRecording, navigation, runVoicePipeline]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const spinReverse = spinValueReverse.interpolate({
        inputRange: [0, 1],
        outputRange: ['360deg', '0deg'],
    });

    const getIcon = () => {
        switch (mode) {
            case 'camera':
                return <Icon name="camera" size={64} color="#60A5FA" />;
            case 'voice':
                return <Icon name="mic" size={64} color="#A78BFA" />;
            default:
                return <Text style={styles.textIcon}>Abc</Text>;
        }
    };

    const showAnalyzing = phase === 'analyzing';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {phase === 'pick' && (
                <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()} hitSlop={12}>
                    <Icon name="chevron-left" size={28} color="#94A3B8" />
                    <Text style={styles.backLabel}>Back</Text>
                </TouchableOpacity>
            )}

            {mode === 'camera' && phase === 'pick' && (
                <View style={styles.choiceBlock}>
                    <Text style={styles.choiceTitle}>Face mood</Text>
                    <Text style={styles.choiceSubtitle}>Take a selfie or choose a clear photo of a face.</Text>
                    <TouchableOpacity style={styles.primaryBtn} onPress={onTakePhoto}>
                        <View style={styles.btnRow}>
                            <Icon name="camera" size={22} color="#F8FAFC" />
                            <Text style={styles.primaryBtnText}>Open camera</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={onPickGallery}>
                        <View style={styles.btnRow}>
                            <Icon name="image" size={22} color="#93C5FD" />
                            <Text style={styles.secondaryBtnText}>Choose from gallery</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {mode === 'voice' && phase === 'pick' && (
                <View style={styles.choiceBlock}>
                    <Text style={styles.choiceTitle}>Speak to Vibe</Text>
                    <Text style={styles.choiceSubtitle}>
                        Tap record, say how you feel in your own words, then tap stop. Vibe will read what you said and respond.
                    </Text>
                    <TouchableOpacity
                        style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
                        onPress={onToggleVoiceRecord}
                    >
                        <View style={styles.btnRow}>
                            <Icon name={isRecording ? 'square' : 'mic'} size={28} color="#F8FAFC" />
                            <Text style={styles.primaryBtnText}>
                                {isRecording ? 'Stop & analyze' : 'Start recording'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    {Platform.OS === 'ios' && (
                        <Text style={styles.hint}>Microphone permission is requested when you start recording.</Text>
                    )}
                </View>
            )}

            {showAnalyzing && (
                <View style={styles.analyzingSection}>
                    <View style={styles.iconWrapper}>
                        <View style={styles.glow} />
                        <View style={styles.iconContainer}>
                            {getIcon()}
                            <Animated.View
                                style={[styles.spinRing, styles.spinRingOuter, { transform: [{ rotate: spin }] }]}
                            />
                            <Animated.View
                                style={[
                                    styles.spinRing,
                                    styles.spinRingInner,
                                    { transform: [{ rotate: spinReverse }] },
                                ]}
                            />
                        </View>
                    </View>
                    <Text style={styles.status}>{status}</Text>
                    <Text style={styles.description}>Please wait while our AI processes your input</Text>
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${progress}%` }]} />
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
        paddingHorizontal: 32,
    },
    backRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        alignSelf: 'flex-start',
    },
    backLabel: {
        color: '#94A3B8',
        fontSize: 16,
        marginLeft: 4,
    },
    choiceBlock: {
        flex: 1,
        justifyContent: 'center',
        paddingBottom: 48,
    },
    choiceTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 10,
        letterSpacing: -0.5,
    },
    choiceSubtitle: {
        fontSize: 15,
        color: '#94A3B8',
        marginBottom: 28,
        lineHeight: 22,
    },
    btnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtn: {
        backgroundColor: '#2563EB',
        paddingVertical: 16,
        borderRadius: 14,
        marginBottom: 12,
    },
    primaryBtnText: {
        color: '#F8FAFC',
        fontSize: 17,
        fontWeight: '600',
        marginLeft: 10,
    },
    secondaryBtn: {
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.45)',
        paddingVertical: 16,
        borderRadius: 14,
    },
    secondaryBtnText: {
        color: '#93C5FD',
        fontSize: 17,
        fontWeight: '600',
        marginLeft: 10,
    },
    recordBtn: {
        backgroundColor: '#6D28D9',
        paddingVertical: 18,
        borderRadius: 14,
    },
    recordBtnActive: {
        backgroundColor: '#B91C1C',
    },
    hint: {
        marginTop: 16,
        fontSize: 13,
        color: '#64748B',
    },
    analyzingSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconWrapper: {
        width: 224,
        height: 224,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 48,
        alignSelf: 'center',
    },
    glow: {
        position: 'absolute',
        width: 224,
        height: 224,
        borderRadius: 112,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        top: 0,
        left: 0,
    },
    iconContainer: {
        width: 192,
        height: 192,
        borderRadius: 96,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    textIcon: {
        fontSize: 36,
        color: '#38BDF8',
        fontWeight: '700',
    },
    spinRing: {
        position: 'absolute',
        borderRadius: 100,
        borderWidth: 4,
        borderColor: 'transparent',
    },
    spinRingOuter: {
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        borderTopColor: '#3B82F6',
    },
    spinRingInner: {
        width: '80%',
        height: '80%',
        top: '10%',
        left: '10%',
        borderBottomColor: '#6366F1',
        opacity: 0.7,
    },
    status: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 12,
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        color: '#94A3B8',
        marginBottom: 40,
        fontWeight: '300',
        textAlign: 'center',
    },
    progressContainer: {
        width: 256,
        height: 8,
        backgroundColor: '#1E293B',
        borderRadius: 4,
        overflow: 'hidden',
        alignSelf: 'center',
        marginTop: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 4,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
});
