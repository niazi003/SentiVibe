/**
 * Map raw labels from DeepFace / speech models to in-app mood chips (ChatbotScreen emojiMap).
 */
const DETECTOR_TO_APP: Record<string, string> = {
    fear: 'Anxious',
    fearful: 'Anxious',
    anxiety: 'Anxious',
    anxious: 'Anxious',
    surprise: 'Excited',
    surprised: 'Excited',
    disgust: 'Angry',
    contempt: 'Angry',
    happy: 'Happy',
    sad: 'Sad',
    angry: 'Angry',
    neutral: 'Neutral',
    calm: 'Calm',
    excited: 'Excited',
    lonely: 'Lonely',
    focused: 'Focused',
    romantic: 'Romantic',
    silence: 'Neutral',
};

export function mapDetectorEmotionToAppLabel(raw: string | undefined | null): string {
    if (!raw || typeof raw !== 'string') {
        return 'Neutral';
    }
    const key = raw.toLowerCase().trim();
    if (DETECTOR_TO_APP[key]) {
        return DETECTOR_TO_APP[key];
    }
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}
