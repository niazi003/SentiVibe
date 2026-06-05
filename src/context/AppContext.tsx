import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import firestore from '@react-native-firebase/firestore';
import { ChatMessage, UserData, MediaItem } from '../types';
import { AuthContext } from './AuthContext';

interface AppContextType {
    userData: UserData;
    updateUser: (data: Partial<UserData>) => void;
    chatHistory: ChatMessage[];
    setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    resetChat: () => void;
    favorites: MediaItem[];
    toggleFavorite: (item: MediaItem) => void;
    isFavorite: (id: number) => boolean;
}

const defaultChatHistory: ChatMessage[] = [
    {
        id: 1,
        text: "Hi — I'm Vibe. I'm here to listen to how you're feeling, not to chat about random topics.",
        sender: 'bot',
    },
    {
        id: 2,
        text: "Share what's on your mind, use the mic, or show me your face — then we can pick music, videos, or a film that fits your mood.",
        sender: 'bot',
    },
];

export const AppContext = createContext<AppContextType>({
    userData: {},
    updateUser: () => { },
    chatHistory: defaultChatHistory,
    setChatHistory: () => { },
    resetChat: () => { },
    favorites: [],
    toggleFavorite: () => { },
    isFavorite: () => false,
});

interface AppProviderProps {
    children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [userData, setUserData] = useState<UserData>({});
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>(defaultChatHistory);
    const [favorites, setFavorites] = useState<MediaItem[]>([]);

    // ── Sync userData from Firebase Auth ──────────────────────────
    useEffect(() => {
        if (user) {
            setUserData(prev => ({
                ...prev,
                uid: user.uid,
                name: user.name,
                email: user.email,
            }));
            setChatHistory(prev => {
                const newHistory = [...prev];
                if (newHistory[0]) {
                    newHistory[0] = { ...newHistory[0], text: `Hello ${user.name}! I'm Sentivibe.` };
                }
                return newHistory;
            });
        } else {
            // Logged out — clear favorites
            setFavorites([]);
        }
    }, [user]);

    // ── Load favorites from Firestore (real-time listener) ───────
    useEffect(() => {
        if (!user) return;

        const unsubscribe = firestore()
            .collection('users')
            .doc(user.uid)
            .collection('favorites')
            .orderBy('addedAt', 'desc')
            .onSnapshot(
                snapshot => {
                    const items: MediaItem[] = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: data.id,
                            title: data.title,
                            artist: data.artist,
                            duration: data.duration,
                            cover: data.cover,
                            description: data.description || undefined,
                            trailer: data.trailer || undefined,
                            videoUrl: data.videoUrl || undefined,
                            videoId: data.videoId || null,
                            spotifyId: data.spotifyId || undefined,
                            albumArt: data.albumArt || undefined,
                            durationMs: data.durationMs || undefined,
                            type: data.type || undefined,
                            rating: data.rating || undefined,
                            reviews: data.reviews || undefined,
                            year: data.year || undefined,
                            runtime: data.runtime || undefined,
                            rated: data.rated || undefined,
                            director: data.director || undefined,
                            actors: data.actors || undefined,
                            imdbRating: data.imdbRating || undefined,
                            imdbVotes: data.imdbVotes || undefined,
                            awards: data.awards || undefined,
                            country: data.country || undefined,
                            language: data.language || undefined,
                            released: data.released || undefined,
                            boxOffice: data.boxOffice || undefined,
                            imdbId: data.imdbId || undefined,
                        } as MediaItem;
                    });
                    setFavorites(items);
                },
                error => {
                    console.warn('[Firestore] Favorites listener error:', error);
                },
            );

        return () => unsubscribe();
    }, [user]);

    // ── Toggle favorite (add/remove from Firestore) ──────────────
    const toggleFavorite = async (item: MediaItem) => {
        if (!user) return;

        const favRef = firestore()
            .collection('users')
            .doc(user.uid)
            .collection('favorites')
            .doc(String(item.id));

        const exists = favorites.some(f => f.id === item.id);

        if (exists) {
            // Remove from Firestore
            await favRef.delete().catch(err =>
                console.warn('[Firestore] Failed to remove favorite:', err),
            );
        } else {
            // Add to Firestore
            await favRef.set({
                id: item.id,
                title: item.title,
                artist: item.artist,
                duration: item.duration,
                cover: item.cover,
                description: item.description || null,
                trailer: item.trailer || null,
                videoUrl: item.videoUrl || null,
                videoId: item.videoId || null,
                spotifyId: item.spotifyId || null,
                albumArt: item.albumArt || null,
                durationMs: item.durationMs || null,
                type: item.type || null,
                rating: item.rating ?? null,
                reviews: item.reviews || null,
                year: item.year || null,
                runtime: item.runtime || null,
                rated: item.rated || null,
                director: item.director || null,
                actors: item.actors || null,
                imdbRating: item.imdbRating || null,
                imdbVotes: item.imdbVotes || null,
                awards: item.awards || null,
                country: item.country || null,
                language: item.language || null,
                released: item.released || null,
                boxOffice: item.boxOffice || null,
                imdbId: item.imdbId || null,
                addedAt: firestore.FieldValue.serverTimestamp(),
            }).catch(err =>
                console.warn('[Firestore] Failed to add favorite:', err),
            );
        }
        // No need to manually update state — the onSnapshot listener handles it
    };

    const isFavorite = (id: number) => {
        return favorites.some(item => item.id === id);
    };

    // ── Other context functions ──────────────────────────────────
    const updateUser = (data: Partial<UserData>) => {
        setUserData(prev => ({ ...prev, ...data }));
        if (data.name) {
            setChatHistory(prev => {
                const newHistory = [...prev];
                if (newHistory[0]) {
                    newHistory[0] = { ...newHistory[0], text: `Hello ${data.name}! I'm Sentivibe.` };
                }
                return newHistory;
            });
        }
    };

    const resetChat = () => {
        const name = userData.name || user?.name || 'there';
        setChatHistory([
            { id: 1, text: `Hello ${name}! I'm Sentivibe.`, sender: 'bot' },
            { id: 2, text: "How are you feeling today? You can type, speak, or show me!", sender: 'bot' }
        ]);
    };

    return (
        <AppContext.Provider value={{
            userData,
            updateUser,
            chatHistory,
            setChatHistory,
            resetChat,
            favorites,
            toggleFavorite,
            isFavorite
        }}>
            {children}
        </AppContext.Provider>
    );
};
