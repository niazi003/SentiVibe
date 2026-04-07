/**
 * SpotifyService — Community-tested approach (Spotify Web API + Spotify Connect)
 *
 * We do NOT embed/stream Spotify audio ourselves.
 * We remote-control playback on the user's Spotify device (Premium required).
 *
 * Auth: Authorization Code + PKCE via `react-native-app-auth`
 * Playback: Spotify Web API endpoints under `https://api.spotify.com/v1/me/player/*`
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { authorize, refresh, AuthConfiguration } from 'react-native-app-auth';

const SPOTIFY_CLIENT_ID = '6b005eaa189c4461ae998d179c570be7';
const SPOTIFY_REDIRECT_URI = 'sentivibe://spotify-callback';

const SPOTIFY_SCOPES = [
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
].join(' ');

const AUTH_CONFIG: AuthConfiguration = {
  clientId: SPOTIFY_CLIENT_ID,
  redirectUrl: SPOTIFY_REDIRECT_URI,
  scopes: SPOTIFY_SCOPES.split(' '),
  serviceConfiguration: {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
  },
};

const TOKEN_KEY = 'sentivibe_spotify_token_v2';

type StoredTokens = {
  accessToken: string;
  accessTokenExpirationDate?: string;
  refreshToken?: string;
};

async function loadTokens(): Promise<StoredTokens | null> {
  try {
    const raw = await AsyncStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as StoredTokens) : null;
  } catch {
    return null;
  }
}

async function saveTokens(tokens: StoredTokens | null): Promise<void> {
  if (!tokens) {
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }
  await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

function isExpired(expirationDate?: string): boolean {
  if (!expirationDate) return false;
  return Date.now() >= new Date(expirationDate).getTime() - 60_000;
}

export async function startSpotifyAuth(): Promise<void> {
  const result = await authorize(AUTH_CONFIG);
  await saveTokens({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    accessTokenExpirationDate: result.accessTokenExpirationDate,
  });
}

export async function isSpotifyAuthed(): Promise<boolean> {
  const t = await loadTokens();
  return !!t?.accessToken;
}

export async function getAccessToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens?.accessToken) return null;

  if (isExpired(tokens.accessTokenExpirationDate) && tokens.refreshToken) {
    try {
      const refreshed = await refresh(AUTH_CONFIG, {
        refreshToken: tokens.refreshToken,
      });
      const merged: StoredTokens = {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken ?? tokens.refreshToken,
        accessTokenExpirationDate:
          refreshed.accessTokenExpirationDate ?? tokens.accessTokenExpirationDate,
      };
      await saveTokens(merged);
      return merged.accessToken;
    } catch (e) {
      console.warn('[Spotify] refresh failed:', e);
      return null;
    }
  }

  return tokens.accessToken;
}

async function spotifyFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Spotify not authenticated');
  }

  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return res;
}

export async function connectRemote(): Promise<boolean> {
  // Web API does not require a persistent "connect" step.
  // We'll consider "connected" if we can hit /me/player/devices.
  try {
    const res = await spotifyFetch('/me/player/devices');
    return res.ok;
  } catch {
    return false;
  }
}

type SpotifyDevice = {
  id: string;
  is_active: boolean;
  name: string;
  type: string;
};

async function getDevices(): Promise<SpotifyDevice[]> {
  const res = await spotifyFetch('/me/player/devices');
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  return json?.devices || [];
}

async function ensureActiveDevice(): Promise<string | null> {
  const devices = await getDevices();
  const active = devices.find(d => d.is_active);
  if (active?.id) return active.id;

  const fallback = devices[0]?.id;
  if (!fallback) return null;

  // Transfer playback to the first device
  const res = await spotifyFetch('/me/player', {
    method: 'PUT',
    body: JSON.stringify({ device_ids: [fallback], play: true }),
  });
  if (!res.ok) return fallback;
  return fallback;
}

export async function playTrack(spotifyId: string): Promise<boolean> {
  try {
    const deviceId = await ensureActiveDevice();
    if (!deviceId) return false;

    const uri = `spotify:track:${spotifyId}`;
    const res = await spotifyFetch(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
      method: 'PUT',
      body: JSON.stringify({ uris: [uri] }),
    });
    return res.ok;
  } catch (e) {
    console.error('[Spotify] playTrack error:', e);
    return false;
  }
}

export async function pausePlayback(): Promise<void> {
  const deviceId = await ensureActiveDevice();
  if (!deviceId) return;
  await spotifyFetch(`/me/player/pause?device_id=${encodeURIComponent(deviceId)}`, { method: 'PUT' });
}

export async function resumePlayback(): Promise<void> {
  const deviceId = await ensureActiveDevice();
  if (!deviceId) return;
  await spotifyFetch(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, { method: 'PUT' });
}

export async function seekTo(positionMs: number): Promise<void> {
  const deviceId = await ensureActiveDevice();
  if (!deviceId) return;
  await spotifyFetch(
    `/me/player/seek?position_ms=${Math.max(0, Math.floor(positionMs))}&device_id=${encodeURIComponent(deviceId)}`,
    { method: 'PUT' }
  );
}

export async function skipNext(): Promise<void> {
  const deviceId = await ensureActiveDevice();
  if (!deviceId) return;
  await spotifyFetch(`/me/player/next?device_id=${encodeURIComponent(deviceId)}`, { method: 'POST' });
}

export async function skipPrevious(): Promise<void> {
  const deviceId = await ensureActiveDevice();
  if (!deviceId) return;
  await spotifyFetch(`/me/player/previous?device_id=${encodeURIComponent(deviceId)}`, { method: 'POST' });
}

export async function getPlayerState(): Promise<{
  trackName: string;
  artistName: string;
  playbackPosition: number;
  duration: number;
  isPaused: boolean;
} | null> {
  try {
    const res = await spotifyFetch('/me/player');
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    if (!json) return null;
    const item = json?.item;
    return {
      trackName: item?.name || '',
      artistName: item?.artists?.[0]?.name || '',
      playbackPosition: json?.progress_ms || 0,
      duration: item?.duration_ms || 0,
      isPaused: !(json?.is_playing ?? false),
    };
  } catch (e) {
    console.error('[Spotify] getPlayerState error:', e);
    return null;
  }
}

export function onPlayerStateChanged(
  _callback: (state: any) => void
): (() => void) | null {
  // Web API doesn't push playerStateChanged events. We'll rely on polling in the UI.
  return null;
}

export async function disconnectSpotify(): Promise<void> {
  await saveTokens(null);
}
