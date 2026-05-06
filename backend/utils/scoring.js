/**
 * utils/scoring.js
 * Re-ranks Spotify tracks using the user's personal feedback history.
 *
 * Scoring logic:
 *  +2  → artist is in user's favouriteArtists
 *  +1  → track previously liked
 *  -2  → track previously disliked
 *  -1  → track previously skipped
 *  Tracks with score < -1 are filtered out.
 */

/**
 * Normalise a raw Spotify track item into the API response shape.
 * @param {object} item  - raw Spotify track object
 * @returns {object}     - { spotifyId, title, artist, albumArt, previewUrl }
 */
function normaliseTrack(item) {
  return {
    spotifyId: item.id,
    title: item.name,
    artist: item.artists.map((a) => a.name).join(', '),
    artistIds: item.artists.map((a) => a.id),
    albumArt: item.album?.images?.[0]?.url || null,
    previewUrl: item.preview_url || null,
    durationMs: item.duration_ms,
    explicit: item.explicit,
  };
}

/**
 * Rank and filter a list of Spotify tracks for a specific user.
 * @param {Array}  tracks   - raw Spotify track objects
 * @param {object} profile  - user profile from userService
 * @returns {Array}         - sorted, normalised tracks
 */
function rank(tracks, profile) {
  const liked = new Set(profile.likedTracks || []);
  const disliked = new Set(profile.dislikedTracks || []);
  const skipped = new Set(profile.skippedTracks || []);
  const favArtists = new Set(profile.favoriteArtistIds || []);

  const scored = tracks
    .filter((t) => !disliked.has(t.id)) // hard filter: never show disliked
    .map((item) => {
      let score = 0;

      // Boost favourite artists
      if (item.artists.some((a) => favArtists.has(a.id))) score += 2;

      // Boost liked tracks
      if (liked.has(item.id)) score += 1;

      // Penalise skipped tracks
      if (skipped.has(item.id)) score -= 1;

      return { score, track: normaliseTrack(item) };
    })
    .filter((entry) => entry.score >= -1) // soft filter: hide heavily penalised
    .sort((a, b) => b.score - a.score); // highest score first

  return scored.map((entry) => entry.track);
}

module.exports = { rank, normaliseTrack };
