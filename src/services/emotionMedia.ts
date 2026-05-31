/**
 * Camera, gallery, and microphone capture for emotion detection.
 * Uses react-native-image-picker and react-native-audio-recorder-player (classic bridge, v3.x — avoids Nitro codegen mismatch on Android).
 */

import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import AudioRecorderPlayer, {
    AudioEncoderAndroidType,
    AudioSourceAndroidType,
    AVEncoderAudioQualityIOSType,
    AVEncodingOption,
    OutputFormatAndroidType,
} from 'react-native-audio-recorder-player';

/** Single JS wrapper; the native module is global. */
const voiceRecorder = new AudioRecorderPlayer();

const facePickerOptions = {
    mediaType: 'photo' as const,
    quality: 0.9 as const,
    maxWidth: 1280,
    maxHeight: 1280,
    includeBase64: true,
    cameraType: 'front' as const,
    saveToPhotos: false,
};

export function stripBase64DataUrlPrefix(data: string): string {
    const marker = 'base64,';
    const i = data.indexOf(marker);
    if (i >= 0) {
        return data.slice(i + marker.length);
    }
    return data;
}

export async function ensureAndroidCameraPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
        return true;
    }
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
        title: 'Camera',
        message: 'SentiVibe uses the camera to read facial expression for mood.',
        buttonPositive: 'Allow',
        buttonNegative: 'Cancel',
    });
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Camera blocked', 'Enable camera permission in Settings to use this option.');
        return false;
    }
    return true;
}

export async function ensureAndroidMicPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
        return true;
    }
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
        title: 'Microphone',
        message: 'SentiVibe records your voice to transcribe what you say into text for the AI chat.',
        buttonPositive: 'Allow',
        buttonNegative: 'Cancel',
    });
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Microphone blocked', 'Enable microphone permission in Settings to use voice input.');
        return false;
    }
    return true;
}

/** Base64 image payload for POST /detect/face (no data: URL prefix). */
export async function captureFaceFromCamera(): Promise<string | null> {
    const ok = await ensureAndroidCameraPermission();
    if (!ok) {
        return null;
    }
    const response = await launchCamera(facePickerOptions);
    if (response.didCancel || response.errorCode || !response.assets?.[0]) {
        return null;
    }
    const b64 = response.assets[0].base64;
    if (!b64) {
        Alert.alert('Could not read photo', 'Try again or pick an image from your library.');
        return null;
    }
    return stripBase64DataUrlPrefix(b64);
}

export async function pickFaceFromLibrary(): Promise<string | null> {
    const response = await launchImageLibrary(facePickerOptions);
    if (response.didCancel || response.errorCode || !response.assets?.[0]) {
        return null;
    }
    const b64 = response.assets[0].base64;
    if (!b64) {
        Alert.alert('Could not read image', 'Choose a different photo.');
        return null;
    }
    return stripBase64DataUrlPrefix(b64);
}

/** Audio encoding tuned for the Python pipeline (mono ~16 kHz; container varies by OS). */
export function voiceRecordingAudioSet() {
    if (Platform.OS === 'ios') {
        return {
            AVSampleRateKeyIOS: 16000,
            AVNumberOfChannelsKeyIOS: 1,
            AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
            AVFormatIDKeyIOS: AVEncodingOption.aac,
        };
    }
    return {
        AudioSourceAndroid: AudioSourceAndroidType.MIC,
        OutputFormatAndroid: OutputFormatAndroidType.MPEG_4,
        AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
        AudioSamplingRateAndroid: 16000,
        AudioChannelsAndroid: 1,
    };
}

/** Normalize path returned by the native recorder for RN FormData. */
export function toFileUri(localPath: string): string {
    if (localPath.startsWith('file://')) {
        return localPath;
    }
    return `file://${localPath}`;
}

export function guessVoiceUploadMeta(localPath: string): { fileName: string; mimeType: string } {
    const lower = localPath.toLowerCase();
    if (lower.endsWith('.wav')) {
        return { fileName: 'voice.wav', mimeType: 'audio/wav' };
    }
    if (lower.endsWith('.caf')) {
        return { fileName: 'voice.caf', mimeType: 'audio/x-caf' };
    }
    return { fileName: 'voice.m4a', mimeType: 'audio/mp4' };
}

export async function startVoiceRecording(): Promise<void> {
    await voiceRecorder.startRecorder(undefined, voiceRecordingAudioSet(), false);
}

export async function stopVoiceRecording(): Promise<string> {
    return voiceRecorder.stopRecorder();
}

export async function discardVoiceRecording(): Promise<void> {
    try {
        await voiceRecorder.stopRecorder();
    } catch {
        // not recording
    }
}
