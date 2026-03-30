/**
 * API Service
 * 
 * Frontend client for the SentiVibe backend.
 * Handles fetching recommendations, error handling,
 * and caching the last successful result to AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { TrackRecommendation, ApiResponse } from '../types';

// Backend URL — Physical Device Setup
// The physical phone needs the exact local IP address of your computer on the Wi-Fi network.
const BASE_URL = __DEV__
  ? 'http://192.168.18.33:3001/api'
  : 'http://192.168.18.33:3001/api'; // Replace with prod URL

const CACHE_KEY_PREFIX = 'sentivibe_recommendations_';
const REQUEST_TIMEOUT = 15000; // 15 seconds

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
