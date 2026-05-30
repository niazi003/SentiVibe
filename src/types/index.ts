import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
    Splash: undefined;
    Welcome: undefined;
    Login: undefined;
    Signup: undefined;
    Onboarding: { isUpdate?: boolean } | undefined;
    Chatbot: { detectedEmotion?: string; reset?: boolean; backToChoices?: boolean } | undefined;
    Detection: { mode: 'camera' | 'voice' | 'text' };
    Results: { emotion: string; initialTab: 'Music' | 'Video' | 'Movie' };
    Player: {
        item: MediaItem;
        queue: MediaItem[];
        type: 'Music' | 'Video' | 'Movie';
    };
    History: undefined;
    Profile: undefined;
    Settings: undefined;
    EmotionError: undefined;
    Favorites: undefined;
};

export type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * MediaItem — used throughout the app for both old hardcoded data
 * and new API-fetched data. Extended with videoId for YouTube iframe player.
 */
export interface MediaItem {
    id: number;
    title: string;
    artist: string;
    duration: string;
    cover: string;
    rating?: number;               // Dataset rating (movies only, e.g. 7.4)
    description?: string;
    trailer?: string;
    videoUrl?: string;
    videoId?: string | null;       // YouTube video ID (for react-native-youtube-iframe)
    spotifyId?: string;            // Spotify track ID
    albumArt?: string;             // Spotify album artwork
    durationMs?: number;           // Duration in milliseconds
    type?: 'Music' | 'Video' | 'Movie';
}

/**
 * TrackRecommendation — shape returned by our backend API.
 * Gets mapped to MediaItem for use in the app.
 */
export interface TrackRecommendation {
    id: number;
    title: string;
    artist: string;
    duration: string;
    durationMs: number;
    spotifyId: string;
    cover: string;
    albumArt: string;
    videoId: string | null;
    youtubeTitle: string | null;
    videoUrl: string | null;
}

/** Movie recommendation from /api/recommendations/movies */
export interface MovieRecommendation {
    id: number;
    title: string;
    artist: string;
    duration: string;
    cover: string;
    description?: string;
    rating?: number;
    emotion?: string;
    videoId?: string | null;
    videoUrl?: string | null;
    trailer?: string | null;
}

/**
 * ApiResponse — generic wrapper for API call results.
 * Carries loading/error state alongside the data.
 */
export interface ApiResponse<T> {
    data: T | null;
    cached: boolean;
    error: string | null;
    loading: boolean;
}

/**
 * PlayerState — global player state managed by PlayerContext.
 */
export interface PlayerState {
    currentTrack: MediaItem | null;
    queue: MediaItem[];
    history: MediaItem[];
    isPlaying: boolean;
    isVideoMode: boolean;
    currentTime: number;     // seconds
    duration: number;        // seconds
}

export interface ChatMessage {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    isResult?: boolean;
    showFeedback?: boolean;
    isChoice?: boolean;
}

export interface UserData {
    uid?: string;
    name?: string;
    email?: string;
}

export interface HistoryItem {
    id: number;
    date: string;
    mood: string;
    media: string;
}
