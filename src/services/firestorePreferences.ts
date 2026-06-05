/**
 * Firestore Preferences Service
 *
 * Save and retrieve user preferences from Firestore
 * at the path: users/{uid}/preferences/main
 */

import firestore from '@react-native-firebase/firestore';
import { getCurrentUser } from './firebaseAuth';
import { saveUserPreferences as savePreferencesToBackend } from './api';

// Re-use the same interface from api.ts
export interface UserPreferences {
  genres?: string[];
  favoriteArtists?: string[];
  energyPreference?: Record<string, string>;
  languagePreference?: string;
  decadePreference?: string;
  movieGenres?: string[];
  movieNightVibe?: string;
  onboardingComplete?: boolean;
  updatedAt?: string;
}

/**
 * Save user preferences to Firestore.
 * Stored at: users/{uid} (merged into the user doc)
 */
export async function savePreferencesToFirestore(
  prefs: Partial<UserPreferences>,
): Promise<{ success: boolean; backendSynced?: boolean }> {
  try {
    const user = getCurrentUser();
    if (!user) return { success: false };

    const payload = {
      ...prefs,
      onboardingComplete: true,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    await firestore().collection('users').doc(user.uid).set(
      { preferences: payload },
      { merge: true },
    );

    // Best-effort sync for Spotify-backed music recommendations (requires Spotify token).
    // Firestore is the source of truth — do not fail the save if backend sync is unavailable.
    const backendResult = await savePreferencesToBackend({
      genres: prefs.genres,
      favoriteArtists: prefs.favoriteArtists,
      energyPreference: prefs.energyPreference,
      languagePreference: prefs.languagePreference,
      decadePreference: prefs.decadePreference,
      movieGenres: prefs.movieGenres,
      movieNightVibe: prefs.movieNightVibe,
    });

    if (!backendResult.success) {
      console.warn(
        '[Preferences] Firestore saved but backend sync failed — connect Spotify to personalize music picks',
      );
    }

    return { success: true, backendSynced: backendResult.success };
  } catch (error) {
    console.warn('[Firestore] savePreferences failed:', error);
    return { success: false };
  }
}

/**
 * Push Firestore preferences to the backend.
 * Call after Spotify connects so music personalization works without re-login.
 */
export async function syncPreferencesToBackend(): Promise<boolean> {
  try {
    const prefs = await getPreferencesFromFirestore();
    if (!prefs.onboardingComplete) return false;

    const result = await savePreferencesToBackend({
      genres: prefs.genres,
      favoriteArtists: prefs.favoriteArtists,
      energyPreference: prefs.energyPreference,
      languagePreference: prefs.languagePreference,
      decadePreference: prefs.decadePreference,
      movieGenres: prefs.movieGenres,
      movieNightVibe: prefs.movieNightVibe,
    });

    if (result.success) {
      console.log('[Preferences] Backend sync complete');
    } else {
      console.warn('[Preferences] Backend sync skipped or failed — Spotify token may be missing');
    }

    return result.success;
  } catch (error) {
    console.warn('[Preferences] syncPreferencesToBackend failed:', error);
    return false;
  }
}

/**
 * Fetch user preferences from Firestore.
 * Returns empty object if no preferences exist.
 */
export async function getPreferencesFromFirestore(): Promise<UserPreferences> {
  try {
    const user = getCurrentUser();
    if (!user) return {};

    const doc = await firestore().collection('users').doc(user.uid).get();
    if (!doc.exists) return {};

    const data = doc.data();
    return (data?.preferences as UserPreferences) || {};
  } catch (error) {
    console.warn('[Firestore] getPreferences failed:', error);
    return {};
  }
}

// ─────────────────────────────────────────────────────────────
// MOOD HISTORY
// ─────────────────────────────────────────────────────────────

/**
 * Save a detected mood to Firestore.
 * Stored at: users/{uid}/moodHistory/{auto-id}
 */
export async function saveMoodToFirestore(
  mood: string,
  source: 'text' | 'camera' | 'voice' | 'chat',
): Promise<void> {
  try {
    const user = getCurrentUser();
    if (!user) return;

    await firestore()
      .collection('users')
      .doc(user.uid)
      .collection('moodHistory')
      .add({
        mood,
        source,
        detectedAt: firestore.FieldValue.serverTimestamp(),
      });
  } catch (error) {
    console.warn('[Firestore] saveMood failed:', error);
  }
}
