/**
 * Spotify Service — Search-based with fallback
 * 
 * Uses the Spotify Search API to find mood-appropriate tracks.
 * If Spotify is unavailable (rate limited, 403, etc.), returns
 * curated fallback data so the app remains functional.
 */

const SpotifyWebApi = require('spotify-web-api-node');

/**
 * Mood → search query mapping.
 * Multiple queries per mood for variety.
 */
const MOOD_SEARCH_QUERIES = {
  happy: ['happy upbeat pop', 'feel good dance', 'cheerful summer hits', 'positive vibes'],
  sad: ['sad emotional ballad', 'heartbreak acoustic', 'melancholy piano', 'sad love songs'],
  excited: ['hype energy workout', 'adrenaline EDM rock', 'pump up anthem', 'energetic hits'],
  angry: ['angry rock metal', 'rage punk hardcore', 'aggressive heavy', 'intense dark rock'],
  relaxed: ['chill relax ambient', 'calm acoustic peaceful', 'lofi chill', 'relaxing jazz'],
  romantic: ['romantic love songs', 'romantic rnb soul', 'love ballad', 'romantic slow dance'],
};

/**
 * Curated fallback data for when Spotify API is unavailable.
 * Includes videoIds so YouTube search can be skipped too.
 */
const FALLBACK_DATA = {
  happy: [
    { title: 'Happy', artist: 'Pharrell Williams', spotifyId: 'fakeid1', albumArt: 'https://i.scdn.co/image/ab67616d0000b2737c3c53395adde94b567d4b1e', duration: '4:00', durationMs: 240000, videoId: 'ZbZSe6N_BXs' },
    { title: "Can't Stop the Feeling!", artist: 'Justin Timberlake', spotifyId: 'fakeid2', albumArt: 'https://i.scdn.co/image/ab67616d0000b273a3c870db3ee27a3d2a3e57df', duration: '4:02', durationMs: 242000, videoId: 'ru0K8uYEZWw' },
    { title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', spotifyId: 'fakeid3', albumArt: 'https://i.scdn.co/image/ab67616d0000b27361f4139a5765e0e2b2faa7e0', duration: '4:31', durationMs: 271000, videoId: 'OPf0YbXqDm0' },
    { title: 'Shake It Off', artist: 'Taylor Swift', spotifyId: 'fakeid4', albumArt: 'https://i.scdn.co/image/ab67616d0000b273a5b3fc8a1e3a2bfb2f5850f7', duration: '3:39', durationMs: 219000, videoId: 'nfWlot6h_JM' },
    { title: 'Walking on Sunshine', artist: 'Katrina & The Waves', spotifyId: 'fakeid5', albumArt: 'https://i.scdn.co/image/ab67616d0000b2731c5eecb89288c3ef5e0e50c7', duration: '3:58', durationMs: 238000, videoId: 'iPUmE-tne5U' },
    { title: 'Good Feeling', artist: 'Flo Rida', spotifyId: 'fakeid6', albumArt: 'https://i.scdn.co/image/ab67616d0000b273cb80e4c7ec37aa41b8e5a5b1', duration: '4:08', durationMs: 248000, videoId: '3OnnDqH6Wj8' },
    { title: 'On Top of the World', artist: 'Imagine Dragons', spotifyId: 'fakeid7', albumArt: 'https://i.scdn.co/image/ab67616d0000b273e8d55b5210f42ff05b0ae5e2', duration: '3:12', durationMs: 192000, videoId: 'w5tWYmIOWGk' },
    { title: 'Best Day of My Life', artist: 'American Authors', spotifyId: 'fakeid8', albumArt: 'https://i.scdn.co/image/ab67616d0000b273e6e4b87e53cf37e42d8c8eee', duration: '3:14', durationMs: 194000, videoId: 'Y66j_BUCBMY' },
    { title: 'Stronger', artist: 'Kelly Clarkson', spotifyId: 'fakeid9', albumArt: 'https://i.scdn.co/image/ab67616d0000b2738bef4e3bd5d4a8e4bbe97f9f', duration: '3:42', durationMs: 222000, videoId: 'Xn676-fLq7I' },
    { title: 'Dynamite', artist: 'BTS', spotifyId: 'fakeid10', albumArt: 'https://i.scdn.co/image/ab67616d0000b2731c3e0a58f91ea60ac71e7235', duration: '3:19', durationMs: 199000, videoId: 'gdZLi9oWNZg' },
  ],
  sad: [
    { title: 'Someone Like You', artist: 'Adele', spotifyId: 'fakeids1', albumArt: 'https://i.scdn.co/image/ab67616d0000b2732118bf9b198b05a95ded6300', duration: '4:45', durationMs: 285000, videoId: 'hLQl3WQQoQ0' },
    { title: 'Fix You', artist: 'Coldplay', spotifyId: 'fakeids2', albumArt: 'https://i.scdn.co/image/ab67616d0000b2730b6a7f089a5d48e21e tried', duration: '4:55', durationMs: 295000, videoId: 'k4V3Mo61fJM' },
    { title: 'All of Me', artist: 'John Legend', spotifyId: 'fakeids3', albumArt: 'https://i.scdn.co/image/ab67616d0000b273ec41c8f3c59c8f3d8b06d7e8', duration: '5:00', durationMs: 300000, videoId: '450p7goxZqg' },
    { title: 'Say Something', artist: 'A Great Big World ft. Christina Aguilera', spotifyId: 'fakeids4', albumArt: 'https://i.scdn.co/image/ab67616d0000b273d3ce05af1c8d39b8e3c0b7e1', duration: '3:50', durationMs: 230000, videoId: '-2U0Ivkn2Ds' },
    { title: 'Skinny Love', artist: 'Bon Iver', spotifyId: 'fakeids5', albumArt: 'https://i.scdn.co/image/ab67616d0000b273f4f69e6f3ea9b3c0e1a1f3e6', duration: '3:58', durationMs: 238000, videoId: 'ssdgFoHLwnk' },
    { title: 'Hurt', artist: 'Johnny Cash', spotifyId: 'fakeids6', albumArt: 'https://i.scdn.co/image/ab67616d0000b273c4a38d8a6d0b2fa2f5b1c9e4', duration: '3:38', durationMs: 218000, videoId: '8AHCfZTRGiI' },
    { title: 'Mad World', artist: 'Gary Jules', spotifyId: 'fakeids7', albumArt: 'https://i.scdn.co/image/ab67616d0000b273e5b1e9e8b2c5f3a4d6e7f8a1', duration: '3:07', durationMs: 187000, videoId: '4N3N1MlvVhc' },
    { title: 'The Night We Met', artist: 'Lord Huron', spotifyId: 'fakeids8', albumArt: 'https://i.scdn.co/image/ab67616d0000b273d8a31c7b4e0e5d9f1a2b3c4d', duration: '3:28', durationMs: 208000, videoId: 'KtlgYxa6BMU' },
    { title: 'Tears in Heaven', artist: 'Eric Clapton', spotifyId: 'fakeids9', albumArt: 'https://i.scdn.co/image/ab67616d0000b273a1b2c3d4e5f6a7b8c9d0e1f2', duration: '4:33', durationMs: 273000, videoId: 'JxPj3GAYYZ0' },
    { title: 'Everybody Hurts', artist: 'R.E.M.', spotifyId: 'fakeids10', albumArt: 'https://i.scdn.co/image/ab67616d0000b273b1c2d3e4f5a6b7c8d9e0f1a2', duration: '5:20', durationMs: 320000, videoId: '5rOiW_xY-kc' },
  ],
  excited: [
    { title: 'Eye of the Tiger', artist: 'Survivor', spotifyId: 'fakeide1', albumArt: 'https://i.scdn.co/image/ab67616d0000b273a1b2c3d4e5f6a7b8', duration: '4:05', durationMs: 245000, videoId: 'btPJPFnesV4' },
    { title: "Don't Stop Me Now", artist: 'Queen', spotifyId: 'fakeide2', albumArt: 'https://i.scdn.co/image/ab67616d0000b273b1c2d3e4f5a6b7c8', duration: '3:30', durationMs: 210000, videoId: 'HgzGwKwLmgM' },
    { title: 'Lose Yourself', artist: 'Eminem', spotifyId: 'fakeide3', albumArt: 'https://i.scdn.co/image/ab67616d0000b273c1d2e3f4a5b6c7d8', duration: '5:30', durationMs: 330000, videoId: '_Yhyp-_hX2s' },
    { title: 'Stronger', artist: 'Kanye West', spotifyId: 'fakeide4', albumArt: 'https://i.scdn.co/image/ab67616d0000b273d1e2f3a4b5c6d7e8', duration: '5:12', durationMs: 312000, videoId: 'PsO6ZnUZI0g' },
    { title: 'Till I Collapse', artist: 'Eminem ft. Nate Dogg', spotifyId: 'fakeide5', albumArt: 'https://i.scdn.co/image/ab67616d0000b273e1f2a3b4c5d6e7f8', duration: '5:00', durationMs: 300000, videoId: 'ytQ5CYE1VZw' },
    { title: 'Thunderstruck', artist: 'AC/DC', spotifyId: 'fakeide6', albumArt: 'https://i.scdn.co/image/ab67616d0000b273f1a2b3c4d5e6f7a8', duration: '4:52', durationMs: 292000, videoId: 'v2AC41dglnM' },
    { title: 'Centuries', artist: 'Fall Out Boy', spotifyId: 'fakeide7', albumArt: 'https://i.scdn.co/image/ab67616d0000b273a2b3c4d5e6f7a8b9', duration: '3:48', durationMs: 228000, videoId: 'LBr7kECJGKY' },
    { title: 'Radioactive', artist: 'Imagine Dragons', spotifyId: 'fakeide8', albumArt: 'https://i.scdn.co/image/ab67616d0000b273b2c3d4e5f6a7b8c9', duration: '3:07', durationMs: 187000, videoId: 'ktvTqknDobU' },
    { title: 'We Will Rock You', artist: 'Queen', spotifyId: 'fakeide9', albumArt: 'https://i.scdn.co/image/ab67616d0000b273c2d3e4f5a6b7c8d9', duration: '2:01', durationMs: 121000, videoId: '-tJYN-eG1zk' },
    { title: 'Sabotage', artist: 'Beastie Boys', spotifyId: 'fakeide10', albumArt: 'https://i.scdn.co/image/ab67616d0000b273d2e3f4a5b6c7d8e9', duration: '2:58', durationMs: 178000, videoId: 'z5rRZdiu1UE' },
  ],
};

let spotifyApi = null;
let tokenExpiry = 0;

/**
 * Initialize Spotify client and handle token lifecycle.
 */
async function initSpotify() {
  if (!spotifyApi) {
    spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    });
  }

  if (Date.now() >= tokenExpiry - 30000) {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);
    tokenExpiry = Date.now() + data.body['expires_in'] * 1000;
    console.log('[Spotify] Token refreshed');
  }

  return spotifyApi;
}

/**
 * Get mood-based song recommendations.
 * 
 * Tries Spotify Search API first. If that fails (403, rate limit, etc.),
 * falls back to curated data with real YouTube videoIds.
 * 
 * @param {string} mood - Detected mood
 * @param {number} limit - Number of tracks
 * @returns {{ tracks: Array, source: 'spotify' | 'fallback' }}
 */
async function getRecommendationsByMood(mood, limit = 10) {
  const normalizedMood = mood.toLowerCase();

  // Try Spotify first
  try {
    const api = await initSpotify();
    const queries = MOOD_SEARCH_QUERIES[normalizedMood] || MOOD_SEARCH_QUERIES['happy'];

    console.log(`[Spotify] Searching for mood: ${normalizedMood}`);

    const allTracks = [];
    const seenIds = new Set();

    for (const query of queries) {
      const perQuery = Math.ceil(limit / queries.length) + 2;
      const result = await api.searchTracks(query, { limit: perQuery });

      for (const track of (result.body.tracks?.items || [])) {
        if (!seenIds.has(track.id)) {
          seenIds.add(track.id);
          allTracks.push({
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            spotifyId: track.id,
            albumArt: track.album.images[0]?.url || '',
            duration: `${Math.floor(track.duration_ms / 60000)}:${String(
              Math.floor((track.duration_ms % 60000) / 1000)
            ).padStart(2, '0')}`,
            durationMs: track.duration_ms,
            _popularity: track.popularity || 0,
          });
        }
      }

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (allTracks.length > 0) {
      allTracks.sort((a, b) => b._popularity - a._popularity);
      const final = allTracks.slice(0, limit).map(({ _popularity, ...t }) => t);
      console.log(`[Spotify] Returning ${final.length} live tracks`);
      return { tracks: final, source: 'spotify' };
    }
  } catch (err) {
    const code = err.statusCode || err.status || 'unknown';
    console.warn(`[Spotify] API error (${code}), using fallback data`);
  }

  // Fallback: return curated data
  console.log(`[Spotify] Using fallback data for mood: ${normalizedMood}`);
  const fallback = FALLBACK_DATA[normalizedMood] || FALLBACK_DATA['happy'];
  return { tracks: fallback.slice(0, limit), source: 'fallback' };
}

module.exports = { getRecommendationsByMood, MOOD_SEARCH_QUERIES };
