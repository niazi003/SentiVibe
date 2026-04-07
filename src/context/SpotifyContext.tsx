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

interface SpotifyContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const SpotifyContext = createContext<SpotifyContextType>({
  isConnected: false,
  isConnecting: false,
  connect: async () => {},
  disconnect: async () => {},
});

export const SpotifyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // NOTE: We previously handled browser-based OAuth via deep links.
  // The current flow uses the native Spotify SDK (`SpotifyAuth.authorize`) instead,
  // so we no longer rely on deep-link callbacks here.

  // Auto-reconnect if previously authenticated
  useEffect(() => {
    (async () => {
      const authed = await isSpotifyAuthed();
      if (authed) {
        console.log('[SpotifyContext] Previously authed, attempting reconnect');
        const connected = await connectRemote();
        setIsConnected(connected);
      }
    })();
  }, []);

  // Start the OAuth flow
  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      await startSpotifyAuth();
      const connected = await connectRemote();
      setIsConnected(connected);
      if (!connected) {
        Alert.alert(
          'Spotify Connection',
          'Authenticated but could not connect to Spotify app. Make sure Spotify is installed and running.',
        );
      }
    } catch (error) {
      console.error('[SpotifyContext] Connect error:', error);
      Alert.alert('Spotify', 'Could not open Spotify authorization page.');
    }
    setIsConnecting(false);
  }, []);

  // Disconnect
  const disconnect = useCallback(async () => {
    await disconnectSpotify();
    setIsConnected(false);
  }, []);

  return (
    <SpotifyContext.Provider value={{ isConnected, isConnecting, connect, disconnect }}>
      {children}
    </SpotifyContext.Provider>
  );
};

export const useSpotify = () => useContext(SpotifyContext);
