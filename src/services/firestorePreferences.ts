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
): Promise<{ success: boolean }> {
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

    // Spotify recommendations read from the backend JSON store (keyed by Spotify user id).
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
      console.warn('[Preferences] Firestore saved but backend sync failed — music picks may be stale until Spotify is connected');
    }

    return { success: true };
  } catch (error) {
    console.warn('[Firestore] savePreferences failed:', error);
    return { success: false };
  }
}

/**
 * Push Firestore preferences to the backend (for users who edited prefs before dual-write existed).
 */
export async function syncPreferencesToBackend(): Promise<void> {
  try {
    const prefs = await getPreferencesFromFirestore();
    if (!prefs.onboardingComplete) return;

    await savePreferencesToBackend({
      genres: prefs.genres,
      favoriteArtists: prefs.favoriteArtists,
      energyPreference: prefs.energyPreference,
      languagePreference: prefs.languagePreference,
      decadePreference: prefs.decadePreference,
      movieGenres: prefs.movieGenres,
      movieNightVibe: prefs.movieNightVibe,
    });
  } catch (error) {
    console.warn('[Preferences] syncPreferencesToBackend failed:', error);
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
