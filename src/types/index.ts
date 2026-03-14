import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
    Splash: undefined;
    Welcome: undefined;
    Login: undefined;
    Signup: undefined;
    Questionnaire: undefined;
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

export interface MediaItem {
    id: number;
    title: string;
    artist: string;
    duration: string;
    cover: string;
    description?: string;
    trailer?: string;
    videoUrl?: string;
    type?: 'Music' | 'Video' | 'Movie';
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
    name?: string;
    email?: string;
}

export interface HistoryItem {
    id: number;
    date: string;
    mood: string;
    media: string;
}
