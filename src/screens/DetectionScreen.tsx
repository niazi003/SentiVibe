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

    // ── Centralised error classifier ──────────────────────────────────────
    // Maps any face-detection result or thrown error to a specific, actionable
    // alert. Returns true if the error is "retryable" (stay on pick screen),
    // false if it is a hard failure that should route to EmotionError.
    const handleFaceError = useCallback(
        (errorCode: string | undefined, rawMessage: string | undefined): boolean => {
            setPhase('pick');
            setProgress(0);

            switch (errorCode) {
                // ── Face-guard rejections (HTTP 422 from Python) ──────────
                case 'no_face_detected':
                    Alert.alert(
                        '😶 No face found',
                        'We couldn\'t detect a human face in that photo.\n\n'
                        + 'Things to check:\n'
                        + '  • Your face should fill most of the frame\n'
                        + '  • Make sure the photo is well-lit\n'
                        + '  • Remove sunglasses, masks, or heavy filters\n'
                        + '  • Animals and objects won\'t work here',
                        [{ text: 'Try a different photo', style: 'default' }]
                    );
                    return true; // retryable

                case 'multiple_faces_detected':
                    Alert.alert(
                        '👥 Multiple faces detected',
                        'SentiVibe reads emotion from a single person.\n\n'
                        + 'Please use a photo where only your face is visible — crop out other people and try again.',
                        [{ text: 'Try a different photo', style: 'default' }]
                    );
                    return true; // retryable

                // ── Gateway-level errors (HTTP 504 / 503 / 502 from Node.js) ──
                case 'face_detection_timeout':
                    Alert.alert(
                        '⏱️ Analysis timed out',
                        'The AI model took too long to respond. This usually happens on the first request while the model is warming up.\n\nWait a few seconds and try again.',
                        [{ text: 'Try again' }]
                    );
                    return true; // retryable

                case 'emotion_service_unavailable':
                    Alert.alert(
                        '🔌 Emotion service is offline',
                        'The Python emotion server isn\'t running.\n\nPlease start it with:\n  python emotion_server.py\n\nThen try again.',
                        [{ text: 'OK' }]
                    );
                    return false; // fatal

                case 'face_detection_failed':
                    Alert.alert(
                        '⚠️ Detection failed',
                        rawMessage
                            ? `The server reported:\n"${rawMessage}"\n\nPlease try again.`
                            : 'An unexpected error occurred during face detection. Please try again.',
                        [{ text: 'OK' }]
                    );
                    return false; // treat as fatal

                default: {
                    // Last resort: classify by message content for thrown JS errors
                    // (network failures, AbortError, etc. that don't have an error code).
                    const msg = (rawMessage ?? '').toLowerCase();

                    if (msg.includes('timed out') || msg.includes('timeout') || msg.includes('aborted')) {
                        Alert.alert(
                            '⏱️ Analysis timed out',
                            'The server took too long to respond. This usually happens when the AI model is still warming up.\n\nWait a few seconds and try again.',
                            [{ text: 'OK' }]
                        );
                        return true;
                    }

                    if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection') || msg.includes('econnrefused') || msg.includes('not running')) {
                        Alert.alert(
                            '📡 Can\'t reach the server',
                            'Check that:\n'
                            + '  • Your phone and PC are on the same Wi-Fi\n'
                            + '  • The Python emotion server is running\n'
                            + '  • ngrok / the tunnel URL is up to date',
                            [{ text: 'OK' }]
                        );
                        return false;
                    }

                    if (msg.includes('decode') || msg.includes('400')) {
                        Alert.alert(
                            '🖼️ Could not read image',
                            'The photo format wasn\'t recognised. Try taking a fresh selfie with the camera instead of choosing from gallery.',
                            [{ text: 'OK' }]
                        );
                        return true;
                    }

                    Alert.alert(
                        '⚠️ Something went wrong',
                        rawMessage
                            ? `The server said:\n"${rawMessage}"\n\nPlease try again.`
                            : 'An unexpected error occurred. Please try again.',
                        [{ text: 'OK' }]
                    );
                    return false;
                }
            }
        },
        []
    );

    const handleVoiceError = useCallback(
        (rawMessage: string | undefined): boolean => {
            setPhase('pick');
            setProgress(0);
            setIsRecording(false);

            const msg = (rawMessage ?? '').toLowerCase();

            if (msg.includes('timed out') || msg.includes('timeout') || msg.includes('aborted')) {
                Alert.alert(
                    '⏱️ Transcription timed out',
                    'The server took too long to process your recording.\n\nTry recording a shorter clip (5–15 seconds work best).',
                    [{ text: 'OK' }]
                );
                return true;
            }

            if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection') || msg.includes('econnrefused')) {
                Alert.alert(
                    '📡 Can\'t reach the server',
                    'Check that the Python emotion server is running and your device is on the same network.',
                    [{ text: 'OK' }]
                );
                return false;
            }

            if (msg.includes('speech') || msg.includes('audio') || msg.includes('empty') || msg.includes('silent')) {
                Alert.alert(
                    '🎙️ No speech detected',
                    'We couldn\'t hear anything in the recording.\n\nSpeak clearly and hold the phone closer. Background noise can also affect results.',
                    [{ text: 'Try again', style: 'default' }]
                );
                return true;
            }

            Alert.alert(
                '⚠️ Voice analysis failed',
                rawMessage
                    ? `The server said:\n"${rawMessage}"\n\nPlease try again.`
                    : 'An unexpected error occurred. Please try again.',
                [{ text: 'OK' }]
            );
            return false;
        },
        []
    );
    // ─────────────────────────────────────────────────────────────────────

    const runFacePipeline = useCallback(
        async (imageBase64: string) => {
            setPhase('analyzing');
            setStatus('Analyzing facial expression...');
            setProgress(35);
            try {
                const result = await detectFaceEmotion(imageBase64);
                setProgress(100);

                // HTTP 422 face-guard errors are returned as resolved values (not thrown).
                if (result.error === 'no_face_detected') {
                    handleFaceError('no_face_detected', result.message);
                    return;
                }
                if (result.error === 'multiple_faces_detected') {
                    handleFaceError('multiple_faces_detected', result.message);
                    return;
                }
                if (result.error) {
                    // Any other structured error from the face guard
                    handleFaceError(result.error, result.message);
                    return;
                }

                goToChatWithEmotion(result.emotion);
            } catch (e) {
                // Network / timeout / server crash — classify and decide if fatal
                const isFatal = !handleFaceError(undefined, (e as Error).message);
                if (isFatal) {
                    navigation.navigate('EmotionError');
                }
            }
        },
        [goToChatWithEmotion, handleFaceError, navigation]
    );

    const runVoicePipeline = useCallback(
        async (localPath: string) => {
            setPhase('analyzing');
            setStatus('Transcribing your voice...');
            setProgress(30);
            try {
                const uri = toFileUri(localPath);
                const { fileName, mimeType } = guessVoiceUploadMeta(localPath);
                const result = await transcribeVoice(uri, fileName, mimeType);
                setProgress(100);
                navigation.navigate('Chatbot', { voiceTranscript: result.transcript });
            } catch (e) {
                const isFatal = !handleVoiceError((e as Error).message);
                if (isFatal) {
                    navigation.navigate('EmotionError');
                }
            }
        },
        [handleVoiceError, navigation]
    );

    const onTakePhoto = useCallback(async () => {
        try {
            const b64 = await captureFaceFromCamera();
            if (!b64) return; // user cancelled
            await runFacePipeline(b64);
        } catch (e) {
            // Camera permission denied or hardware error — runFacePipeline has already
            // handled AI errors internally; this catch only fires for camera-level failures.
            console.error('[Detection] camera open failed:', e);
            setPhase('pick');
            setProgress(0);
            Alert.alert(
                '📷 Camera unavailable',
                'Could not open the camera. Make sure SentiVibe has camera permission in your device settings.',
                [{ text: 'OK' }]
            );
        }
    }, [runFacePipeline]);

    const onPickGallery = useCallback(async () => {
        try {
            const b64 = await pickFaceFromLibrary();
            if (!b64) return; // user cancelled
            await runFacePipeline(b64);
        } catch (e) {
            // Gallery permission denied or file read error
            console.error('[Detection] gallery pick failed:', e);
            setPhase('pick');
            setProgress(0);
            Alert.alert(
                '🖼️ Gallery unavailable',
                'Could not read the selected photo. Make sure SentiVibe has photo library permission, or try taking a selfie instead.',
                [{ text: 'OK' }]
            );
        }
    }, [runFacePipeline]);

    const onToggleVoiceRecord = useCallback(async () => {
        if (!isRecording) {
            const ok = await ensureAndroidMicPermission();
            if (!ok) {
                Alert.alert(
                    '🎙️ Microphone permission required',
                    'SentiVibe needs microphone access to analyse your voice.\n\nGo to Settings → Apps → SentiVibe → Permissions and enable Microphone.',
                    [{ text: 'OK' }]
                );
                return;
            }
            try {
                await startVoiceRecording();
                setIsRecording(true);
            } catch (e) {
                console.error('[Detection] record start:', e);
                Alert.alert(
                    '🎙️ Could not start recording',
                    'Another app may be using the microphone, or the recording service failed to initialise. Close other apps and try again.',
                    [{ text: 'OK' }]
                );
            }
            return;
        }

        setIsRecording(false);
        try {
            const path = await stopVoiceRecording();
            if (!path?.trim()) {
                Alert.alert(
                    '🎙️ No audio captured',
                    'The recording was too short or empty. Tap record, speak for at least 2–3 seconds, then tap stop.',
                    [{ text: 'Try again', style: 'default' }]
                );
                return;
            }
            await runVoicePipeline(path);
        } catch (e) {
            console.error('[Detection] stop/upload voice:', e);
            handleVoiceError((e as Error).message);
        }
    }, [handleVoiceError, isRecording, runVoicePipeline]);

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
