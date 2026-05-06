/**
 * controllers/recommendController.js
 * Handles POST /api/recommend  –  mood-based Spotify track recommendations.
 *
 * Flow:
 *  1. Fetch user profile (genres, artists, feedback history)
 *  2. Map mood → Spotify audio feature targets
 *  3. Call Spotify Recommendations API
 *  4. Re-rank results using personal scoring
 *  5. Return normalised track list to client
 */

const userService = require('../services/userService');
const spotifyService = require('../services/spotify');
const moodMapping = require('../utils/moodMapping');
const scoring = require('../utils/scoring');

/**
 * POST /api/recommend
 * Body: { userId, mood, context?: { timeOfDay, activity } }
 */
async function handleRecommend(req, res) {
  const { userId, mood, context = {} } = req.body;

  if (!userId || !mood) {
    return res.status(400).json({ error: 'userId and mood are required.' });
  }

  const profile = userService.getProfile(userId);

  // Mood → Spotify audio features
  const audioFeatures = moodMapping.getFeatures(mood, context);

  // Build seed params from user's favourite genres/artists
  const seedGenres = (profile.favoriteGenres || ['pop']).slice(0, 3);
  const artistSeeds = (profile.favoriteArtistIds || []).slice(0, 2);

  const params = {
    seed_genres: seedGenres.join(','),
    seed_artists: artistSeeds.join(','),
    limit: 20,
    market: 'US',
    mood: mood, // Pass mood down for search query
    ...audioFeatures, // target_valence, target_energy, target_tempo
  };

  // Remove empty seed_artists to avoid Spotify validation error
  if (!params.seed_artists) delete params.seed_artists;

  try {
    const rawTracks = await spotifyService.getRecommendations(params, profile.explicitAllowed);

    // Re-rank based on user's like/skip history
    const rankedTracks = scoring.rank(rawTracks, profile);

    return res.json({ tracks: rankedTracks, mood, audioFeatures });
  } catch (err) {
    console.error('[recommendController] Spotify error:', err.message);
    return res.status(502).json({
      error: 'Failed to fetch recommendations.',
      message: err.message,
    });
  }
}

module.exports = { handleRecommend };
