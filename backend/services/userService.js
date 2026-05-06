/**
 * services/userService.js
 * In-memory user profile store.
 *
 * Profile schema per user:
 * {
 *   userId          : string,
 *   favoriteGenres  : string[],          // e.g. ['pop', 'indie']
 *   favoriteArtists : string[],          // artist display names
 *   favoriteArtistIds: string[],         // Spotify artist IDs
 *   language        : string,            // e.g. 'en'
 *   explicitAllowed : boolean,
 *   likedTracks     : string[],          // Spotify track IDs
 *   dislikedTracks  : string[],
 *   skippedTracks   : string[],
 *   moodHistory     : [{ mood, ts }],    // last 50 moods
 * }
 */

const profileStore = new Map();

/** Default profile template for new users */
function createDefaultProfile(userId) {
  return {
    userId,
    favoriteGenres: ['pop', 'indie', 'chill'],
    favoriteArtists: [],
    favoriteArtistIds: [],
    language: 'en',
    explicitAllowed: false,
    likedTracks: [],
    dislikedTracks: [],
    skippedTracks: [],
    moodHistory: [],
  };
}

/**
 * Get (or create) a user profile.
 * @param {string} userId
 * @returns {object} profile
 */
function getProfile(userId) {
  if (!profileStore.has(userId)) {
    profileStore.set(userId, createDefaultProfile(userId));
  }
  return profileStore.get(userId);
}

/**
 * Partially update a user profile (merges top-level keys).
 * @param {string} userId
 * @param {object} updates - keys to merge into the profile
 */
function updateProfile(userId, updates) {
  const profile = getProfile(userId);
  Object.assign(profile, updates);
}

/**
 * Record a track interaction (like/dislike/skip).
 * Ensures the trackId appears in exactly one of the three lists.
 * @param {string} userId
 * @param {string} trackId
 * @param {'like'|'dislike'|'skip'} action
 * @param {string} [mood]
 */
function updateFeedback(userId, trackId, action, mood) {
  const profile = getProfile(userId);

  // Remove from all lists first (clean state)
  ['likedTracks', 'dislikedTracks', 'skippedTracks'].forEach((list) => {
    profile[list] = profile[list].filter((id) => id !== trackId);
  });

  // Add to the relevant list
  const listMap = {
    like: 'likedTracks',
    dislike: 'dislikedTracks',
    skip: 'skippedTracks',
  };
  if (listMap[action]) {
    profile[listMap[action]].push(trackId);
  }

  // Optionally record mood associated with this interaction
  if (mood) appendMoodHistory(userId, mood);
}

/**
 * Append a mood entry to the user's mood history (capped at 50).
 * @param {string} userId
 * @param {string} mood
 */
function appendMoodHistory(userId, mood) {
  const profile = getProfile(userId);
  profile.moodHistory.push({ mood, ts: new Date().toISOString() });
  if (profile.moodHistory.length > 50) {
    profile.moodHistory = profile.moodHistory.slice(-50);
  }
}

/**
 * Return a plain summary of a user's interaction history (used by RAG).
 * @param {string} userId
 * @returns {string}
 */
function getInteractionSummary(userId) {
  const p = getProfile(userId);
  const recentMoods = p.moodHistory
    .slice(-5)
    .map((m) => m.mood)
    .join(', ');
  return (
    `User likes: ${p.likedTracks.length} tracks. ` +
    `Genres: ${p.favoriteGenres.join(', ')}. ` +
    `Recent moods: ${recentMoods || 'none yet'}.`
  );
}

/** Return all profiles (debug / admin use) */
function getAllProfiles() {
  return Object.fromEntries(profileStore);
}

module.exports = {
  getProfile,
  updateProfile,
  updateFeedback,
  appendMoodHistory,
  getInteractionSummary,
  getAllProfiles,
};
