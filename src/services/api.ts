/**
 * API Service
 * 
 * Frontend client for the SentiVibe backend.
 * All requests go through the single Node.js gateway (BASE_URL).
 * When using ngrok, only this one URL needs to change.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { TrackRecommendation, ApiResponse } from '../types';

// ─────────────────────────────────────────────────────────────
// SINGLE GATEWAY URL — change this ONE value for ngrok
// ─────────────────────────────────────────────────────────────
const BASE_URL = __DEV__
  ? 'http://192.168.18.33:3001/api'
  : 'http://192.168.18.33:3001/api'; // Replace with prod / ngrok URL

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

    const response = await fetch(
      `${BASE_URL}/recommendations?mood=${encodeURIComponent(mood)}&limit=${limit}`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    // Cache successful result for offline fallback
    await AsyncStorage.setItem(
      `${CACHE_KEY_PREFIX}${mood.toLowerCase()}`,
      JSON.stringify(data.tracks)
    ).catch(() => {}); // Don't fail if storage write fails

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
      const cachedData = await AsyncStorage.getItem(
        `${CACHE_KEY_PREFIX}${mood.toLowerCase()}`
      );

      if (cachedData) {
        return {
          data: JSON.parse(cachedData),
          cached: true,
          error: 'Using cached data (offline)',
          loading: false,
        };
      }
    } catch {} // Ignore cache read errors

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
 * Routes through Node.js → Python Emotion Service (DeepFace).
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
