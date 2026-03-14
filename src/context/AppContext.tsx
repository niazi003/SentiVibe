import React, { createContext, useState, ReactNode } from 'react';
import { ChatMessage, UserData, MediaItem } from '../types';

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
    { id: 1, text: "Hello Uzair! I'm Sentivibe.", sender: 'bot' },
    { id: 2, text: "How are you feeling today? You can type, speak, or show me!", sender: 'bot' }
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
    const [userData, setUserData] = useState<UserData>({});
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>(defaultChatHistory);
    const [favorites, setFavorites] = useState<MediaItem[]>([]);

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
        const name = userData.name || 'Uzair';
        setChatHistory([
            { id: 1, text: `Hello ${name}! I'm Sentivibe.`, sender: 'bot' },
            { id: 2, text: "How are you feeling today? You can type, speak, or show me!", sender: 'bot' }
        ]);
    };

    const toggleFavorite = (item: MediaItem) => {
        setFavorites(prev => {
            const exists = prev.find(i => i.id === item.id);
            if (exists) {
                return prev.filter(i => i.id !== item.id);
            }
            return [...prev, item];
        });
    };

    const isFavorite = (id: number) => {
        return favorites.some(item => item.id === id);
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
