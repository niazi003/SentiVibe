/**
 * SpotifyContext — Global Spotify Connection State
 *
 * Manages:
 * - Whether the user has connected their Spotify account
 * - Deep link handling for OAuth callback
 * - Auto-reconnection on app launch if previously connected
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import {
  startSpotifyAuth,
  isSpotifyAuthed,
  connectRemote,
  disconnectSpotify,
} from '../services/spotify';
import { syncPreferencesToBackend } from '../services/firestorePreferences';

interface SpotifyContextType {
  /** True when the user has a valid Spotify OAuth token (API + recommendations). */
  isAuthed: boolean;
  /** True when Spotify playback devices are reachable (in-app player control). */
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const SpotifyContext = createContext<SpotifyContextType>({
  isAuthed: false,
  isConnected: false,
  isConnecting: false,
  connect: async () => {},
  disconnect: async () => {},
});

export const SpotifyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthed, setIsAuthed] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const refreshConnectionState = useCallback(async (syncPrefs: boolean) => {
    const authed = await isSpotifyAuthed();
    setIsAuthed(authed);

    if (!authed) {
      setIsConnected(false);
      return;
    }

    const connected = await connectRemote();
    setIsConnected(connected);

    if (syncPrefs) {
      await syncPreferencesToBackend();
    }
  }, []);

  // Restore Spotify session on launch (no Firebase re-login required)
  useEffect(() => {
    refreshConnectionState(true).catch((error) => {
      console.warn('[SpotifyContext] Auto-reconnect failed:', error);
    });
  }, [refreshConnectionState]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      await startSpotifyAuth();
      setIsAuthed(true);

      // Push saved Firestore prefs to backend now that we have a Spotify token
      const synced = await syncPreferencesToBackend();

      const connected = await connectRemote();
      setIsConnected(connected);

      if (!connected) {
        Alert.alert(
          'Spotify Connected',
          synced
            ? 'Your preferences are synced. Open the Spotify app on this device for in-app playback control.'
            : 'Spotify is linked. Set your preferences in Personalization Settings for personalized music picks.',
        );
      }
    } catch (error) {
      console.error('[SpotifyContext] Connect error:', error);
      Alert.alert('Spotify', 'Could not complete Spotify authorization. Please try again.');
    }
    setIsConnecting(false);
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectSpotify();
    setIsAuthed(false);
    setIsConnected(false);
  }, []);

  return (
    <SpotifyContext.Provider value={{ isAuthed, isConnected, isConnecting, connect, disconnect }}>
      {children}
    </SpotifyContext.Provider>
  );
};

export const useSpotify = () => useContext(SpotifyContext);
