/**
 * PlayerContext — Global Player State
 * 
 * Single source of truth for playback state.
 * Ensures audio and video tabs stay perfectly synced —
 * switching tabs does NOT restart playback.
 * 
 * Features:
 * - Current track, queue, and history management
 * - Play/pause/next/previous controls
 * - Video/audio mode toggle
 * - Persists last played track to AsyncStorage
 * - Restores last played on app launch
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MediaItem, PlayerState } from '../types';

const LAST_PLAYED_KEY = 'sentivibe_last_played';

// ---- Action Types ----
type PlayerAction =
    | { type: 'PLAY_TRACK'; track: MediaItem; queue?: MediaItem[] }
    | { type: 'PAUSE' }
    | { type: 'RESUME' }
    | { type: 'SET_PLAYING'; isPlaying: boolean }
    | { type: 'NEXT' }
    | { type: 'PREVIOUS' }
    | { type: 'SET_VIDEO_MODE'; isVideo: boolean }
    | { type: 'SET_TIME'; currentTime: number; duration: number }
    | { type: 'PLAY_FROM_QUEUE'; track: MediaItem }
    | { type: 'RESTORE_TRACK'; track: MediaItem };

// ---- Initial State ----
const initialState: PlayerState = {
    currentTrack: null,
    queue: [],
    history: [],
    isPlaying: false,
    isVideoMode: false,
    currentTime: 0,
    duration: 0,
};

// ---- Reducer ----
// All state transitions in one place — easy to debug and test
function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
    switch (action.type) {
        case 'PLAY_TRACK':
            return {
                ...state,
                currentTrack: action.track,
                queue: action.queue || [],
                history: state.currentTrack
                    ? [...state.history, state.currentTrack]
                    : state.history,
                isPlaying: true,
                currentTime: 0,
                duration: 0,
            };

        case 'PAUSE':
            return { ...state, isPlaying: false };

        case 'RESUME':
            return { ...state, isPlaying: true };

        case 'SET_PLAYING':
            return { ...state, isPlaying: action.isPlaying };

        case 'NEXT':
            if (state.queue.length === 0) return state;
            return {
                ...state,
                currentTrack: state.queue[0],
                queue: state.queue.slice(1),
                history: state.currentTrack
                    ? [...state.history, state.currentTrack]
                    : state.history,
                isPlaying: true,
                currentTime: 0,
                duration: 0,
            };

        case 'PREVIOUS':
            if (state.history.length === 0) return state;
            const prevTrack = state.history[state.history.length - 1];
            return {
                ...state,
                currentTrack: prevTrack,
                history: state.history.slice(0, -1),
                queue: state.currentTrack
                    ? [state.currentTrack, ...state.queue]
                    : state.queue,
                isPlaying: true,
                currentTime: 0,
                duration: 0,
            };

        // Toggle video/audio mode WITHOUT restarting playback
        case 'SET_VIDEO_MODE':
            return { ...state, isVideoMode: action.isVideo };

        // Update playback progress (called by YouTube player callbacks)
        case 'SET_TIME':
            return {
                ...state,
                currentTime: action.currentTime,
                duration: action.duration,
            };

        case 'PLAY_FROM_QUEUE': {
            const idx = state.queue.findIndex(t => t.id === action.track.id);
            if (idx === -1) return state;
            return {
                ...state,
                currentTrack: action.track,
                queue: state.queue.slice(idx + 1),
                history: state.currentTrack
                    ? [...state.history, state.currentTrack]
                    : state.history,
                isPlaying: true,
                currentTime: 0,
                duration: 0,
            };
        }

        case 'RESTORE_TRACK':
            return {
                ...state,
                currentTrack: action.track,
                isPlaying: false,
            };

        default:
            return state;
    }
}

// ---- Context ----
interface PlayerContextType {
    state: PlayerState;
    playTrack: (track: MediaItem, queue?: MediaItem[]) => void;
    pause: () => void;
    resume: () => void;
    togglePlay: () => void;
    setPlaying: (isPlaying: boolean) => void;
    next: () => void;
    previous: () => void;
    setVideoMode: (isVideo: boolean) => void;
    setTime: (currentTime: number, duration: number) => void;
    playFromQueue: (track: MediaItem) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// ---- Provider ----
export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(playerReducer, initialState);

    // Persist last played track whenever it changes
    useEffect(() => {
        if (state.currentTrack) {
            AsyncStorage.setItem(
                LAST_PLAYED_KEY,
                JSON.stringify(state.currentTrack)
            ).catch(() => {}); // Fire-and-forget
        }
    }, [state.currentTrack?.id]);

    // Restore last played track on mount (bonus feature)
    useEffect(() => {
        AsyncStorage.getItem(LAST_PLAYED_KEY)
            .then(data => {
                if (data) {
                    const track = JSON.parse(data);
                    dispatch({ type: 'RESTORE_TRACK', track });
                }
            })
            .catch(() => {}); // Ignore restore failures
    }, []);

    const contextValue: PlayerContextType = {
        state,
        playTrack: (track, queue) => dispatch({ type: 'PLAY_TRACK', track, queue }),
        pause: () => dispatch({ type: 'PAUSE' }),
        resume: () => dispatch({ type: 'RESUME' }),
        togglePlay: () => dispatch({ type: state.isPlaying ? 'PAUSE' : 'RESUME' }),
        setPlaying: (isPlaying) => dispatch({ type: 'SET_PLAYING', isPlaying }),
        next: () => dispatch({ type: 'NEXT' }),
        previous: () => dispatch({ type: 'PREVIOUS' }),
        setVideoMode: (isVideo) => dispatch({ type: 'SET_VIDEO_MODE', isVideo }),
        setTime: (currentTime, duration) => dispatch({ type: 'SET_TIME', currentTime, duration }),
        playFromQueue: (track) => dispatch({ type: 'PLAY_FROM_QUEUE', track }),
    };

    return (
        <PlayerContext.Provider value={contextValue}>
            {children}
        </PlayerContext.Provider>
    );
};

// ---- Hook ----
export const usePlayer = (): PlayerContextType => {
    const context = useContext(PlayerContext);
    if (!context) {
        throw new Error('usePlayer must be used within a PlayerProvider');
    }
    return context;
};
