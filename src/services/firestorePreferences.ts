/**
 * Firestore Preferences Service
 *
 * Save and retrieve user preferences from Firestore
 * at the path: users/{uid}/preferences/main
 */

import firestore from '@react-native-firebase/firestore';
import { getCurrentUser } from './firebaseAuth';

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

    await firestore().collection('users').doc(user.uid).set(
      {
        preferences: {
          ...prefs,
          onboardingComplete: true,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    );

    return { success: true };
  } catch (error) {
    console.warn('[Firestore] savePreferences failed:', error);
    return { success: false };
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
