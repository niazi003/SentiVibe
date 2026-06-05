/**
 * User Preferences Service
 *
 * JSON-file-based persistence for user personalization preferences.
 * Keyed by Spotify user ID, stores genre/artist/energy/language/decade + movie prefs.
 */

const fs = require('fs');
const path = require('path');

const PREFS_FILE = path.join(__dirname, '..', 'data', 'userPreferences.json');

// Ensure data dir and file exist
function ensureFile() {
  const dir = path.dirname(PREFS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(PREFS_FILE)) {
    fs.writeFileSync(PREFS_FILE, '{}', 'utf-8');
  }
}

function readAll() {
  ensureFile();
  try {
    const raw = fs.readFileSync(PREFS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeAll(data) {
  ensureFile();
  fs.writeFileSync(PREFS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Get preferences for a specific Spotify user ID.
 * @param {string} userId
 * @returns {object} user preferences or empty object
 */
function getPreferences(userId) {
  if (!userId) return {};
  const all = readAll();
  return all[userId] || {};
}

/**
 * Valid genre values (matches the onboarding UI choices).
 */
const VALID_GENRES = [
  'pop', 'hip-hop', 'r&b', 'rock', 'edm', 'classical', 'jazz',
  'lo-fi', 'k-pop', 'punjabi/desi', 'urdu/hindi', 'latin', 'metal',
];

const VALID_ENERGY_LEVELS = ['high', 'medium', 'low'];
const VALID_LANGUAGES = ['english', 'urdu+hindi', 'mix', 'no preference'];
const VALID_DECADES = ['1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s', 'no preference'];

/**
 * Validate and save preferences for a Spotify user.
 * @param {string} userId
 * @param {object} prefs - { genres, favoriteArtists, energyPreference, languagePreference, decadePreference, movieGenres, movieNightVibe }
 * @returns {{ success: boolean, errors?: string[] }}
 */
function savePreferences(userId, prefs) {
  if (!userId) return { success: false, errors: ['Missing user ID'] };

  const errors = [];

  // Validate genres — must be array, 0-13 items (0 = user cleared preferences)
  if (prefs.genres !== undefined) {
    if (!Array.isArray(prefs.genres)) {
      errors.push('genres must be an array');
    } else if (prefs.genres.length > 13) {
      errors.push('genres cannot exceed 13 entries');
    }
  }

  // Validate favoriteArtists — must be array of strings, max 5
  if (prefs.favoriteArtists !== undefined) {
    if (!Array.isArray(prefs.favoriteArtists)) {
      errors.push('favoriteArtists must be an array');
    } else if (prefs.favoriteArtists.length > 5) {
      errors.push('favoriteArtists cannot exceed 5 entries');
    } else if (!prefs.favoriteArtists.every(a => typeof a === 'string')) {
      errors.push('favoriteArtists entries must be strings');
    }
  }

  // Validate energyPreference — object with mood keys
  if (prefs.energyPreference !== undefined) {
    if (typeof prefs.energyPreference !== 'object' || prefs.energyPreference === null) {
      errors.push('energyPreference must be an object');
    }
  }

  if (prefs.movieGenres !== undefined) {
    if (!Array.isArray(prefs.movieGenres)) {
      errors.push('movieGenres must be an array');
    } else if (prefs.movieGenres.length > 10) {
      errors.push('movieGenres cannot exceed 10 entries');
    } else if (!prefs.movieGenres.every((g) => typeof g === 'string')) {
      errors.push('movieGenres entries must be strings');
    }
  }

  if (prefs.movieNightVibe !== undefined && typeof prefs.movieNightVibe !== 'string') {
    errors.push('movieNightVibe must be a string');
  }

  if (errors.length > 0) {
    console.warn(`[Preferences] Validation failed for user ${userId}:`, errors);
    return { success: false, errors };
  }

  // Merge with existing prefs (partial update supported)
  const all = readAll();
  const existing = all[userId] || {};

  all[userId] = {
    ...existing,
    genres: prefs.genres ?? existing.genres ?? [],
    favoriteArtists: prefs.favoriteArtists ?? existing.favoriteArtists ?? [],
    energyPreference: prefs.energyPreference ?? existing.energyPreference ?? {},
    languagePreference: prefs.languagePreference ?? existing.languagePreference ?? 'no preference',
    decadePreference: prefs.decadePreference ?? existing.decadePreference ?? 'no preference',
    movieGenres: prefs.movieGenres ?? existing.movieGenres ?? [],
    movieNightVibe: prefs.movieNightVibe ?? existing.movieNightVibe ?? 'no preference',
    onboardingComplete: true,
    updatedAt: new Date().toISOString(),
  };

  writeAll(all);
  console.log(`[Preferences] Saved preferences for user: ${userId}`);
  return { success: true };
}

module.exports = {
  getPreferences,
  savePreferences,
  VALID_GENRES,
  VALID_ENERGY_LEVELS,
  VALID_LANGUAGES,
  VALID_DECADES,
};
