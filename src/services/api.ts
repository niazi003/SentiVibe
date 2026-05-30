/**
 * API Service
 * 
 * Frontend client for the SentiVibe backend.
 * All requests go through the single Node.js gateway (BASE_URL).
 * When using ngrok, only this one URL needs to change.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { TrackRecommendation, MovieRecommendation, ApiResponse } from '../types';
import { getAccessToken } from './spotify';

// ─────────────────────────────────────────────────────────────
// SINGLE GATEWAY URL — change this ONE value for ngrok
// ─────────────────────────────────────────────────────────────
const BASE_URL = __DEV__
  ? 'https://frugality-endocrine-probably.ngrok-free.dev/api'  //http://192.168.18.33:3001/api
  : 'https://frugality-endocrine-probably.ngrok-free.dev/api'; // Replace with prod / ngrok URL

const CACHE_KEY_PREFIX = 'sentivibe_recommendations_';
const REQUEST_TIMEOUT = 15000; // 15 seconds
const AI_TIMEOUT = 90000; // 90 seconds — LLM inference can be slow

// ─────────────────────────────────────────────────────────────
// RECOMMENDATIONS
// ─────────────────────────────────────────────────────────────

/**
 * Fetch mood-based recommendations from the backend.
 * Falls back to cached data if the network request fails.
 */
export async function fetchRecommendations(
  mood: string,
  limit: number = 10
): Promise<ApiResponse<TrackRecommendation[]>> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const spotifyToken = await getAccessToken().catch(() => null);
    const headers: Record<string, string> = {};
    if (spotifyToken) {
      headers.Authorization = `Bearer ${spotifyToken}`;
    }

    const response = await fetch(
      `${BASE_URL}/recommendations?mood=${encodeURIComponent(mood)}&limit=${limit}`,
      { signal: controller.signal, headers }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    // Cache per mood (and rough auth tier) so personalized lists are not shown offline as generic cache
    const cacheTier = spotifyToken ? 'auth' : 'guest';
    await AsyncStorage.setItem(
      `${CACHE_KEY_PREFIX}${mood.toLowerCase()}_${cacheTier}`,
      JSON.stringify(data.tracks)
    ).catch(() => { }); // Don't fail if storage write fails

    return {
      data: data.tracks,
      cached: data.cached,
      error: null,
      loading: false,
    };
  } catch (error: any) {
    console.warn('[API] Fetch failed, trying cache:', error.message);

    // Attempt to load cached data as fallback
    try {
      const moodKey = mood.toLowerCase();
      const spotifyToken = await getAccessToken().catch(() => null);
      const tier = spotifyToken ? 'auth' : 'guest';
      let cachedData = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${moodKey}_${tier}`);
      if (!cachedData && tier === 'auth') {
        cachedData = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${moodKey}_guest`);
      }
      if (!cachedData) {
        cachedData = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${moodKey}`);
      }


      if (cachedData) {
        return {
          data: JSON.parse(cachedData),
          cached: true,
          error: 'Using cached data (offline)',
          loading: false,
        };
      }
    } catch { } // Ignore cache read errors

    return {
      data: null,
      cached: false,
      error: error.name === 'AbortError'
        ? 'Request timed out. Check your connection.'
        : error.message || 'Failed to fetch recommendations',
      loading: false,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// YOUTUBE SEARCH
// ─────────────────────────────────────────────────────────────

/**
 * Fetch YouTube videoId on-demand for a single track.
 */
export async function fetchYouTubeVideoId(title: string, artist: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(
      `${BASE_URL}/youtube-search?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const data = await response.json();
    return data.videoId || null;
  } catch (error) {
    console.warn('[API] YouTube search failed:', error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// AI CHAT
// ─────────────────────────────────────────────────────────────

export interface ChatResponse {
  reply: string;
  detectedEmotion: string;
}

/**
 * Send a message to the AI chatbot.
 * Routes through Node.js → Python AI (LLaMA 3 + RAG).
 */
export async function sendChatMessage(
  userId: string,
  message: string
): Promise<ChatResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT);

  try {
    const response = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('AI is taking too long. The model may still be loading — try again.');
    }
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
// EMOTION DETECTION
// ─────────────────────────────────────────────────────────────

export interface TextDetectionResponse {
  emotion: string;
  confidence: number;
}

export interface FaceDetectionResponse {
  emotion: string;
}

export interface VoiceDetectionResponse {
  emotion: string;
  /** What the user said (when STT succeeded). */
  transcript?: string;
  /** speech_phrase | speech_text | tone | heuristic */
  source?: string;
  confidence?: number;
}

/**
 * Detect emotion from text input.
 * Routes through Node.js → Python Emotion Service (DistilRoBERTa).
 */
export async function detectTextEmotion(text: string): Promise<TextDetectionResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${BASE_URL}/detect/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Emotion detection timed out.');
    }
    throw error;
  }
}

/**
 * Detect emotion from a face image (base64 encoded).
 * Routes through Node.js → Python Emotion Service (ViT face model).
 */
export async function detectFaceEmotion(imageBase64: string): Promise<FaceDetectionResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${BASE_URL}/detect/face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Face detection timed out.');
    }
    throw error;
  }
}

const VOICE_DETECT_TIMEOUT_MS = 90_000;

/**
 * Detect emotion from a short recorded audio clip (multipart upload).
 * Routes through Node.js → Python Emotion Service (Whisper STT → text emotion; tone is fallback).
 */
export async function detectVoiceEmotion(
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<VoiceDetectionResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VOICE_DETECT_TIMEOUT_MS);

  const form = new FormData();
  /** Prefer Blob: RN `{ uri, name, type }` multipart is sometimes dropped by Multer on the gateway. */
  try {
    const fileRes = await fetch(fileUri);
    const blob = await fileRes.blob();
    if (blob.size > 64) {
      (form as FormData & { append(name: string, value: Blob, fileName?: string): void }).append(
        'audio',
        blob,
        fileName
      );
    } else {
      form.append('audio', {
        uri: fileUri,
        name: fileName,
        type: mimeType,
      } as unknown as Blob);
    }
  } catch {
    form.append('audio', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
  }

  try {
    const response = await fetch(`${BASE_URL}/detect/voice`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      const detail = errorData.message || errorData.error || `HTTP ${response.status}`;
      throw new Error(detail);
    }

    return await response.json();
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const err = error as { name?: string };
    if (err?.name === 'AbortError') {
      throw new Error('Voice detection timed out.');
    }
    throw error;
  }
}

const MOVIE_CACHE_PREFIX = 'sentivibe_movie_recommendations_';

/**
 * Fetch mood-based movie recommendations (TF-IDF dataset + YouTube trailers).
 * Accepts optional user preferences to personalize results.
 */
export async function fetchMovieRecommendations(
  mood: string,
  limit: number = 20,
  userText?: string,
  movieGenres?: string[],
  movieNightVibe?: string,
): Promise<ApiResponse<MovieRecommendation[]>> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    // Build query string manually — RN's URLSearchParams polyfill typing lacks .set()
    const queryParts: string[] = [
      `mood=${encodeURIComponent(mood)}`,
      `limit=${limit}`,
    ];
    if (userText?.trim()) {
      queryParts.push(`text=${encodeURIComponent(userText.trim())}`);
    }
    if (movieGenres && movieGenres.length > 0) {
      queryParts.push(`movieGenres=${encodeURIComponent(JSON.stringify(movieGenres))}`);
    }
    if (movieNightVibe && movieNightVibe !== 'no preference') {
      queryParts.push(`movieNightVibe=${encodeURIComponent(movieNightVibe)}`);
    }

    const response = await fetch(
      `${BASE_URL}/recommendations/movies?${queryParts.join('&')}`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const movies: MovieRecommendation[] = data.movies ?? [];

    // Don't write movies to AsyncStorage — each call is intentionally randomized,
    // so caching would freeze one batch and defeat the variety mechanism.
    // The read-only offline fallback below still works from any pre-existing value.

    return {
      data: movies,
      cached: !!data.cached,
      error: null,
      loading: false,
    };
  } catch (error: unknown) {
    const err = error as { message?: string; name?: string };
    console.warn('[API] Movie fetch failed, trying cache:', err.message);

    try {
      const cachedData = await AsyncStorage.getItem(
        `${MOVIE_CACHE_PREFIX}${mood.toLowerCase()}`
      );
      if (cachedData) {
        return {
          data: JSON.parse(cachedData),
          cached: true,
          error: 'Using cached movies (offline)',
          loading: false,
        };
      }
    } catch {
      /* ignore */
    }

    return {
      data: null,
      cached: false,
      error:
        err?.name === 'AbortError'
          ? 'Request timed out. Check your connection.'
          : err.message || 'Failed to fetch movie recommendations',
      loading: false,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// FEEDBACK
// ─────────────────────────────────────────────────────────────

export interface FeedbackPayload {
  userId: string;
  trackId: string;
  action: 'like' | 'dislike' | 'skip';
  mood?: string;
}

/**
 * Send track feedback (like/dislike/skip) to the backend.
 * This feeds into the personalized recommendation scoring.
 */
export async function sendFeedback(payload: FeedbackPayload): Promise<{ success: boolean }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(`${BASE_URL}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.warn('[API] Feedback failed:', error.message);
    // Feedback is non-critical — don't crash the app
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────

/**
 * Check if the backend server is reachable.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${BASE_URL}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// USER PREFERENCES
// ─────────────────────────────────────────────────────────────

export interface UserPreferences {
  genres?: string[];
  favoriteArtists?: string[];
  energyPreference?: Record<string, string>;
  languagePreference?: string;
  decadePreference?: string;
  /** Lowercase labels matching onboarding movie-genre chips (max 5 saved in UI). */
  movieGenres?: string[];
  /** Single vibe for film suggestions (e.g. comfort, comedy). */
  movieNightVibe?: string;
  onboardingComplete?: boolean;
  updatedAt?: string;
}

/**
 * Fetch user preferences from the backend.
 * Returns empty object if no preferences are set.
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  try {
    const token = await getAccessToken().catch(() => null);
    if (!token) return {};

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(`${BASE_URL}/user/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!response.ok) return {};
    return await response.json();
  } catch (error) {
    console.warn('[API] getUserPreferences failed:', error);
    return {};
  }
}

/**
 * Save user preferences to the backend.
 */
export async function saveUserPreferences(prefs: Partial<UserPreferences>): Promise<{ success: boolean }> {
  try {
    const token = await getAccessToken().catch(() => null);
    if (!token) return { success: false };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(`${BASE_URL}/user/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(prefs),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!response.ok) return { success: false };
    return await response.json();
  } catch (error) {
    console.warn('[API] saveUserPreferences failed:', error);
    return { success: false };
  }
}
