/**
 * utils/moodMapping.js
 * Maps detected emotion + optional context → Spotify audio feature targets.
 *
 * Spotify audio feature ranges: all 0.0–1.0 (except tempo: BPM).
 *  valence : musical positiveness
 *  energy  : intensity and activity
 *  tempo   : BPM
 */

/** Base feature targets per core mood */
const MOOD_FEATURES = {
  happy: { target_valence: 0.8, target_energy: 0.8, target_tempo: 128 },
  sad: { target_valence: 0.2, target_energy: 0.25, target_tempo: 70 },
  calm: { target_valence: 0.5, target_energy: 0.3, target_tempo: 85 },
  angry: { target_valence: 0.25, target_energy: 0.9, target_tempo: 155 },
  anxious: { target_valence: 0.35, target_energy: 0.6, target_tempo: 110 },
  excited: { target_valence: 0.85, target_energy: 0.9, target_tempo: 145 },
  lonely: { target_valence: 0.25, target_energy: 0.3, target_tempo: 72 },
  focused: { target_valence: 0.5, target_energy: 0.5, target_tempo: 100 },
  romantic: { target_valence: 0.7, target_energy: 0.4, target_tempo: 90 },
};

const DEFAULT_FEATURES = {
  target_valence: 0.55,
  target_energy: 0.55,
  target_tempo: 100,
};

/**
 * Get Spotify audio feature params for a mood + optional context.
 * @param {string} mood           - detected emotion string
 * @param {object} context        - optional { timeOfDay, activity }
 * @returns {object}              - Spotify query params object
 */
function getFeatures(mood, context = {}) {
  const base = { ...(MOOD_FEATURES[mood.toLowerCase()] || DEFAULT_FEATURES) };

  // Context adjustments
  const { timeOfDay, activity } = context;

  // Late night → dial down energy slightly for any mood
  if (timeOfDay === 'night' || timeOfDay === 'late_night') {
    base.target_energy = Math.max(0.1, base.target_energy - 0.15);
    base.target_tempo = Math.max(60, base.target_tempo - 15);
  }

  // Morning → boost energy
  if (timeOfDay === 'morning') {
    base.target_energy = Math.min(1.0, base.target_energy + 0.1);
    base.target_tempo = Math.min(180, base.target_tempo + 10);
  }

  // Workout activity → max energy
  if (activity === 'workout') {
    base.target_energy = Math.min(1.0, base.target_energy + 0.2);
    base.target_tempo = Math.min(180, base.target_tempo + 20);
  }

  // Study / focus → calm things down
  if (activity === 'study' || activity === 'focus') {
    base.target_energy = Math.min(0.6, base.target_energy - 0.1);
    base.target_valence = 0.5;
  }

  return base;
}

/** Return all supported moods (useful for client-side dropdowns) */
function getSupportedMoods() {
  return Object.keys(MOOD_FEATURES);
}

module.exports = { getFeatures, getSupportedMoods };
