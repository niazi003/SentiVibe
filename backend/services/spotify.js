/**
 * Spotify Service — mood-based tracks
 *
 * Recommendation flow:
 *   Step 1 → Try personalized search (uses user top tracks/artists + preferences)
 *   Step 2 → Fall back to mood keyword search (client credentials)
 *   Step 3 → Fall back to FALLBACK_DATA (static, guaranteed YouTube IDs)
 *
 * NOTE: Spotify's Recommendations API, audio-features, audio-analysis,
 * browse/featured-playlists, and related-artists endpoints are ALL deprecated
 * as of November 27, 2024. "Made For You" playlists are never exposed via API.
 * None of those are used here.
 */

const SpotifyWebApi = require('spotify-web-api-node');
const { getPreferences } = require('./userPreferences');

/**
 * Mood → multiple search queries for variety.
 * Queries are designed to return well-known, popular songs
 * that are guaranteed to exist on YouTube.
 */
const MOOD_SEARCH_QUERIES = {
  happy:    ['happy hits', 'feel good pop', 'good vibes music', 'dance pop chart hits'],
  sad:      ['sad songs', 'heartbreak playlist', 'emotional ballads', 'lewis capaldi sad love song'],
  excited:  ['pump up songs', 'hype music', 'party hits', 'workout pump up rock hits'],
  angry:    ['angry rap', 'hard rock workout', 'rage music', 'linkin park disturbed metal'],
  calm:     ['chill lofi', 'peaceful acoustic', 'relaxing ambient', 'yiruma river flows einaudi'],
  relaxed:  ['jack johnson acoustic chill', 'jason mraz colbie caillat', 'chill indie folk popular', 'bon iver iron and wine'],
  anxious:  ['bob marley three little birds', 'beatles here comes the sun', 'lean on me bill withers', 'comforting classic songs'],
  lonely:   ['radiohead creep lonely akon', 'pink floyd wish you were here', 'bon iver skinny love', 'indie sad songs popular'],
  focused:  ['focus music', 'deep work playlist', 'concentration beats', 'hans zimmer interstellar time'],
  romantic: ['ed sheeran perfect thinking out loud', 'john legend all of me', 'elvis cant help falling love', 'romantic ballad hits'],
  neutral:  ['top hits today', 'popular songs', 'trending music', 'hozier weeknd hit songs'],
};

/** Mood synonym helpers for building smart search queries */
const MOOD_ADJECTIVES = {
  happy:    ['happy', 'feel good', 'upbeat', 'joyful'],
  sad:      ['sad', 'heartbreak', 'emotional', 'melancholy'],
  excited:  ['hype', 'pump up', 'energetic', 'party'],
  angry:    ['angry', 'rage', 'intense', 'aggressive'],
  calm:     ['calm', 'peaceful', 'soothing', 'relaxing'],
  relaxed:  ['chill', 'mellow', 'laid back', 'easy listening'],
  anxious:  ['comforting', 'uplifting', 'soothing', 'reassuring'],
  lonely:   ['lonely', 'introspective', 'solitude', 'reflective'],
  focused:  ['focus', 'concentration', 'deep work', 'ambient'],
  romantic: ['romantic', 'love', 'sensual', 'intimate'],
  neutral:  ['popular', 'trending', 'top hits', 'chart'],
};

const JUNK_KEYWORDS = [
  'karaoke', 'piano cover', 'cover version', 'backing track', 'tribute', 'made popular',
  'vocal version', 'backing version', 'instrumental version',
  'party tyme', 'in the style of', 'originally performed',
  'workout mix', 'fitness version', '8-bit', 'lullaby',
  'music box', 'midi', 'for dogs', 'for cats', 'for pets',
  'for babies', 'white noise', 'rain sounds', 'nature sounds',
  'sleep sounds', 'asmr', 'meditation', 'hypnosis', 'breeds',
  'canine', 'terrier', 'relaxation for',
];

/**
 * Well-known YouTube video IDs for popular songs.
 * This avoids needing the YouTube Search API for common tracks.
 * Key format: lowercase "title - artist" → videoId
 */
const KNOWN_VIDEO_IDS = {
  // Happy
  'happy - pharrell williams': 'ZbZSe6N_BXs',
  "can't stop the feeling! - justin timberlake": 'ru0K8uYEZWw',
  'uptown funk - mark ronson, bruno mars': 'OPf0YbXqDm0',
  'shake it off - taylor swift': 'nfWlot6h_JM',
  'walking on sunshine - katrina and the waves': 'iPUmE-tne5U',
  'good feeling - flo rida': '3OnnDqH6Wj8',
  'on top of the world - imagine dragons': 'w5tWYmIOWGk',
  'dynamite - bts': 'gdZLi9oWNZg',
  'levitating - dua lipa': 'TUVcZfQe-Kw',
  'blinding lights - the weeknd': '4NRXx6U8ABQ',
  'dance monkey - tones and i': 'q0hyYWKXF0Q',
  'shut up and dance - walk the moon': '6JCLY0Rlx6Q',
  // Sad
  'someone like you - adele': 'hLQl3WQQoQ0',
  'fix you - coldplay': 'k4V3Mo61fJM',
  'all of me - john legend': '450p7goxZqg',
  'say something - a great big world, christina aguilera': '-2U0Ivkn2Ds',
  'someone you loved - lewis capaldi': 'bCuhuePlP8o',
  "when the party's over - billie eilish": 'pbMwTqkKSps',
  'lovely - billie eilish, khalid': 'V1Pl8CzNzCw',
  'the night we met - lord huron': 'KtlgYxa6BMU',
  'skinny love - bon iver': 'ssdgFoHLwnk',
  'hurt - johnny cash': '8AHCfZTRGiI',
  'tears in heaven - eric clapton': 'JxPj3GAYYZ0',
  'everybody hurts - r.e.m.': '5rOiW_xY-kc',
  'let her go - passenger': 'RBumgq5yVrA',
  'stay with me - sam smith': 'pB-5XG-DbAA',
  // Excited
  'eye of the tiger - survivor': 'btPJPFnesV4',
  "don't stop me now - queen": 'HgzGwKwLmgM',
  'lose yourself - eminem': '_Yhyp-_hX2s',
  'stronger - kanye west': 'PsO6ZnUZI0g',
  'till i collapse - eminem, nate dogg': 'ytQ5CYE1VZw',
  'thunderstruck - ac/dc': 'v2AC41dglnM',
  'radioactive - imagine dragons': 'ktvTqknDobU',
  'we will rock you - queen': '-tJYN-eG1zk',
  'centuries - fall out boy': 'LBr7kECJGKY',
  'warriors - imagine dragons': 'fmI_Ndrxy14',
  // Angry
  'in the end - linkin park': 'eVTXPUF4Oz4',
  'numb - linkin park': 'kXYiU_JCYtU',
  'killing in the name - rage against the machine': 'bWXazVhlyxQ',
  'break stuff - limp bizkit': 'ZpUYjpKg9KY',
  'given up - linkin park': '0xyxtzD54rM',
  'bodies - drowning pool': '04F4xlaSjDU',
  'down with the sickness - disturbed': '09LTT0xwdfw',
  'last resort - papa roach': 'j0lSpNtjPM8',
  'chop suey! - system of a down': 'CSvFpBOe8eY',
  'monster - skillet': '1mjlM_RnsVE',
  // Calm
  'weightless - marconi union': 'UfcAVejslrU',
  'sunset lover - petit biscuit': 'wuCK-oiE3rM',
  'breathe me - sia': 'ghPcYqn0p4Y',
  'river flows in you - yiruma': '7maJOI3QMu0',
  'experience - ludovico einaudi': 'hN_q-_nGv4U',
  'clair de lune - claude debussy': 'CvFH_6DNRCY',
  'moonlight sonata - ludwig van beethoven': '4Tr0otuiQuU',
  "somewhere over the rainbow - israel kamakawiwo'ole": 'V1bFr2SWP1I',
  // Anxious
  'lean on me - bill withers': 'fOZ-MySzAQo',
  'here comes the sun - the beatles': 'KQetemT1sWc',
  'three little birds - bob marley & the wailers': 'zaGUr6wDTO0',
  'breathe - telepopmusik': 'vyut3GyQtn0',
  "don't worry be happy - bobby mcferrin": 'd-diB65scQU',
  'what a wonderful world - louis armstrong': 'A3yCcXgbKrE',
  // Lonely
  'lonely - akon': '6EEW-9NDM5k',
  'mad world - gary jules': '4N3N1MlvVhw',
  'creep - radiohead': 'XFkzRNyygfk',
  'space oddity - david bowie': 'iYYRH4apXDo',
  'hallelujah - jeff buckley': 'y8AWFf7EAc4',
  'wish you were here - pink floyd': 'IXdNnw99-Ic',
  "nothing compares 2 u - sinéad o'connor": '0-EF60neguk',
  // Focused
  'time - hans zimmer': 'RxabLA7UQ9k',
  'intro - the xx': 'xMV6l2y67rk',
  'strobe - deadmau5': 'tKi9Z-f6qX4',
  'interstellar main theme - hans zimmer': 'kpz8lpoLvrA',
  "comptine d'un autre été - yann tiersen": 'NvryolGa19A',
  // Romantic
  'perfect - ed sheeran': '2Vv-BfVoq4g',
  'thinking out loud - ed sheeran': 'lp-EO5I60KA',
  'at last - etta james': 'S-cbOl96RFM',
  "can't help falling in love - elvis presley": 'vGJTaP6anOU',
  'a thousand years - christina perri': 'rtOvBOTyX00',
  'just the way you are - bruno mars': 'LjhCEhWiKXk',
  'love story - taylor swift': '8xg3vE8Ie_E',
  'my heart will go on - celine dion': 'DNyKDI9pn0Q',
  'make you feel my love - adele': '0put0_a--Ns',
  // Neutral
  'bohemian rhapsody - queen': 'fJ9rUzIMcZQ',
  'somebody that i used to know - gotye, kimbra': '8UVNT4wvIGY',
  'clocks - coldplay': 'd020hcWA_Wg',
  'viva la vida - coldplay': 'dvgZkm1xWPE',
  'rolling in the deep - adele': 'rYEDA3JcQqw',
  'take me to church - hozier': 'PVjiKRfKpPI',
  'let it be - the beatles': 'QDYfEBY9NM4',
  'hotel california - eagles': 'BciS5krYL80',
  'hey jude - the beatles': 'A_MjCqQoLLA',
  'forrest gump - frank ocean': 'F4b6fIiPQEo',
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
 * Look up a known YouTube videoId for a track.
 * Uses fuzzy matching on "title - artist" against the KNOWN_VIDEO_IDS table.
 */
function findKnownVideoId(title, artist) {
  const normalize = (s) => s.toLowerCase()
    .replace(/\(feat\..*?\)/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const key = `${normalize(title)} - ${normalize(artist)}`;

  // Exact match
  if (KNOWN_VIDEO_IDS[key]) return KNOWN_VIDEO_IDS[key];

  // Partial match: check if track title is contained in any known key
  const titleNorm = normalize(title);
  for (const [knownKey, videoId] of Object.entries(KNOWN_VIDEO_IDS)) {
    if (knownKey.includes(titleNorm) && knownKey.includes(normalize(artist.split(',')[0]))) {
      return videoId;
    }
  }

  return null;
}

/** One-line trace: where recommendation tracks came from. */
function logSongSource(message) {
  console.log(`[Song source] ${message}`);
}

function isJunkTitleArtist(titleLower, artistLower) {
  return JUNK_KEYWORDS.some((kw) => titleLower.includes(kw) || artistLower.includes(kw));
}

function spotifyTrackToRow(track) {
  const artist = track.artists.map((a) => a.name).join(', ');
  const knownVideoId = findKnownVideoId(track.name, artist);
  return {
    title: track.name,
    artist,
    spotifyId: track.id,
    albumArt: track.album.images[0]?.url || '',
    duration: `${Math.floor(track.duration_ms / 60000)}:${String(
      Math.floor((track.duration_ms % 60000) / 1000)
    ).padStart(2, '0')}`,
    durationMs: track.duration_ms,
    videoId: knownVideoId,
    _popularity: track.popularity || 0,
  };
}

function ingestTrackObjects(rawTracks, seenIds, seenTitles, excludeIds, sink) {
  for (const track of rawTracks) {
    if (!track || !track.id || track.type !== 'track') continue;
    if (excludeIds && excludeIds.has(track.id)) continue;
    if (seenIds.has(track.id)) continue;

    const titleLower = track.name.toLowerCase();
    const artistLower = track.artists.map((a) => a.name).join(' ').toLowerCase();
    if (isJunkTitleArtist(titleLower, artistLower)) continue;

    const titleKey = titleLower.replace(/[^a-z0-9]/g, '');
    if (seenTitles.has(titleKey)) continue;
    seenTitles.add(titleKey);
    seenIds.add(track.id);

    sink.push(spotifyTrackToRow(track));
  }
}

/**
 * Mood-based track search (client-credentials API). Used as default and to fill gaps.
 */
async function getTracksFromMoodSearchOnly(api, mood, limit, excludeIds = new Set()) {
  const queries = MOOD_SEARCH_QUERIES[mood] || MOOD_SEARCH_QUERIES.neutral;
  const isTopUp = excludeIds && excludeIds.size > 0;
  if (isTopUp) {
    logSongSource(
      `Spotify track search (supplement) — client credentials, up to ${limit} more tracks for mood="${mood}" (excluding ${excludeIds.size} track id(s))`
    );
  } else {
    logSongSource(
      `Spotify track search (primary) — client credentials + Search API, ${queries.length} mood queries for "${mood}"`
    );
  }
  console.log(`[Spotify] Track search for mood: ${mood} (${queries.length} queries)`);

  const searchPromises = queries.map(async (query) => {
    const perQuery = Math.ceil(limit / queries.length) + 5;
    try {
      const result = await api.searchTracks(query, { limit: perQuery, market: 'PK' });
      return result.body.tracks?.items || [];
    } catch (err) {
      console.warn(`[Spotify] Query failed: "${query}"`, err.message);
      return [];
    }
  });

  const results = await Promise.all(searchPromises);
  const seenIds = new Set(excludeIds);
  const seenTitles = new Set();
  const allTracks = [];

  for (const tracks of results) {
    ingestTrackObjects(tracks, seenIds, seenTitles, null, allTracks);
  }

  allTracks.sort((a, b) => b._popularity - a._popularity);
  return allTracks.slice(0, limit).map(({ _popularity, ...t }) => t);
}

/**
 * Verify that an access token is a valid Spotify user session (lightweight).
 */
async function validateSpotifyUserToken(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') return false;
  try {
    const api = new SpotifyWebApi({ accessToken });
    await api.getMe();
    return true;
  } catch {
    return false;
  }
}

/**
 * Build smart search queries by combining mood, user genres, and language.
 * Falls back to MOOD_SEARCH_QUERIES if no preferences are available.
 *
 * @param {string} mood
 * @param {object} userPrefs - { genres, favoriteArtists, languagePreference }
 * @returns {string[]} search query strings
 */
function buildSmartSearchQueries(mood, userPrefs) {
  const adjectives = MOOD_ADJECTIVES[mood] || MOOD_ADJECTIVES.neutral;
  const genres = userPrefs.genres || [];
  const artists = userPrefs.favoriteArtists || [];
  const language = userPrefs.languagePreference || 'no preference';

  // If no preferences, use default queries
  if (genres.length === 0 && artists.length === 0 && language === 'no preference') {
    return MOOD_SEARCH_QUERIES[mood] || MOOD_SEARCH_QUERIES.neutral;
  }

  const queries = [];

  // Mood + genre combos (pick first 2 adjectives × first 3 genres)
  for (const adj of adjectives.slice(0, 2)) {
    for (const genre of genres.slice(0, 3)) {
      queries.push(`${adj} ${genre}`);
    }
  }

  // Mood + artist combos (up to 3 artists)
  for (const artist of artists.slice(0, 3)) {
    queries.push(`${adjectives[0]} ${artist}`);
  }

  // Language-specific queries
  if (language === 'urdu+hindi' || language === 'mix') {
    queries.push(`${adjectives[0]} urdu songs`);
    queries.push(`${adjectives[0]} hindi songs`);
    if (genres.length > 0) {
      queries.push(`${genres[0]} urdu hindi`);
    }
  }
  if (language === 'english' || language === 'mix') {
    queries.push(`${adjectives[0]} english ${genres[0] || 'pop'}`);
  }

  // Always include at least one broad mood query
  queries.push(`${adjectives[0]} music ${new Date().getFullYear()}`);

  // Deduplicate
  return [...new Set(queries)].slice(0, 8);
}

/**
 * Build personalized mood tracks using user's Spotify data + saved preferences.
 *
 * Steps:
 *   A. Fetch user's top artists
 *   B. Fetch user's top tracks
 *   C. Build smart search queries from preferences
 *   D. Fetch top tracks from user's top artists
 *   E. Deduplicate and prioritize
 *
 * @param {SpotifyWebApi} userApi - authenticated user API instance
 * @param {string} mood
 * @param {object} userPrefs - saved preferences from userPreferences.json
 * @param {number} limit
 * @returns {Array} array of track rows (same shape as spotifyTrackToRow)
 */
async function buildPersonalizedMoodTracks(userApi, mood, userPrefs, limit) {
  const seenIds = new Set();
  const seenTitles = new Set();

  // Priority buckets (higher priority = added first)
  const fromTopTracks = [];
  const fromArtistTopTracks = [];
  const fromPreferenceSearch = [];

  // ── STEP A: Fetch user's top artists ────────────────────────
  let topArtists = [];
  try {
    const res = await userApi.getMyTopArtists({ limit: 5, time_range: 'medium_term' });
    topArtists = (res.body.items || []).map(a => ({ id: a.id, name: a.name }));
    console.log(`[Spotify] Top artists: ${topArtists.map(a => a.name).join(', ') || '(none)'}`);
  } catch (err) {
    console.warn('[Spotify] Failed to fetch top artists:', err.message || err);
  }

  // ── STEP B: Fetch user's top tracks ─────────────────────────
  try {
    const res = await userApi.getMyTopTracks({ limit: 10, time_range: 'medium_term' });
    const rawTracks = res.body.items || [];
    ingestTrackObjects(rawTracks, seenIds, seenTitles, null, fromTopTracks);
    console.log(`[Spotify] Top tracks: ${fromTopTracks.length} ingested`);
  } catch (err) {
    console.warn('[Spotify] Failed to fetch top tracks:', err.message || err);
  }

  // ── STEP C: Build smart search queries & execute ────────────
  const searchQueries = buildSmartSearchQueries(mood, userPrefs);
  console.log(`[Spotify] Smart search queries: ${JSON.stringify(searchQueries)}`);

  const searchPromises = searchQueries.map(async (query) => {
    try {
      const result = await userApi.searchTracks(query, { limit: 8, market: 'US' });
      return result.body.tracks?.items || [];
    } catch (err) {
      console.warn(`[Spotify] Preference query failed: "${query}"`, err.message);
      return [];
    }
  });

  const searchResults = await Promise.all(searchPromises);
  for (const tracks of searchResults) {
    ingestTrackObjects(tracks, seenIds, seenTitles, null, fromPreferenceSearch);
  }
  console.log(`[Spotify] Preference search: ${fromPreferenceSearch.length} tracks from ${searchQueries.length} queries`);

  // ── STEP D: Fetch top tracks from user's top artists ────────
  const artistSlice = topArtists.slice(0, 3);
  for (const artist of artistSlice) {
    try {
      const res = await userApi.getArtistTopTracks(artist.id, 'US');
      const rawTracks = res.body.tracks || [];
      ingestTrackObjects(rawTracks, seenIds, seenTitles, null, fromArtistTopTracks);
    } catch (err) {
      console.warn(`[Spotify] Top tracks for artist "${artist.name}" failed:`, err.message);
    }
  }
  console.log(`[Spotify] Artist top tracks: ${fromArtistTopTracks.length} from ${artistSlice.length} artists`);

  // ── STEP E: Merge with priority ─────────────────────────────
  // Priority order: user top tracks > artist top tracks > preference search
  const merged = [];

  // Add top tracks first (highest priority)
  for (const t of fromTopTracks) {
    if (merged.length >= limit) break;
    merged.push(t);
  }

  // Then artist top tracks
  for (const t of fromArtistTopTracks) {
    if (merged.length >= limit) break;
    merged.push(t);
  }

  // Then preference-based search results (sorted by popularity)
  fromPreferenceSearch.sort((a, b) => b._popularity - a._popularity);
  for (const t of fromPreferenceSearch) {
    if (merged.length >= limit) break;
    merged.push(t);
  }

  // Strip internal _popularity field
  return merged.map(({ _popularity, ...t }) => t);
}

/**
 * Main entry point: mood-based music recommendations.
 *
 * Flow:
 *   Step 1 → Try personalized search (top tracks + artists + preferences)
 *   Step 2 → Fall back to mood keyword search (getTracksFromMoodSearchOnly)
 *   Step 3 → Fall back to FALLBACK_DATA (static curated list)
 *
 * @param {string} mood
 * @param {number} limit
 * @param {{ userAccessToken?: string | null }} [options]
 * @returns {{ tracks: Array, source: string, playlist?: object | null }}
 */
async function getRecommendationsByMood(mood, limit = 10, options = {}) {
  const normalizedMood = mood.toLowerCase();
  const userAccessToken = options.userAccessToken || null;

  if (userAccessToken) {
    logSongSource(
      `Mood="${normalizedMood}", limit=${limit}: user Spotify token present → will try personalized search first`
    );
  } else {
    logSongSource(
      `Mood="${normalizedMood}", limit=${limit}: no user Spotify token → generic mood keyword search`
    );
  }

  // ── Step 1: Personalized search ─────────────────────────────
  if (userAccessToken) {
    try {
      const userApi = new SpotifyWebApi({ accessToken: userAccessToken });

      // Get user's Spotify ID for preference lookup
      let userId = null;
      try {
        const me = await userApi.getMe();
        userId = me.body?.id || null;
      } catch {
        console.warn('[Spotify] Could not fetch user profile for preference lookup');
      }

      const userPrefs = userId ? getPreferences(userId) : {};
      const hasPrefs = userPrefs.onboardingComplete === true;

      const personalizedTracks = await buildPersonalizedMoodTracks(
        userApi,
        normalizedMood,
        userPrefs,
        limit
      );

      if (personalizedTracks.length >= 3) {
        // We have enough personalized tracks
        let rows = personalizedTracks;

        // Top up with generic search if we didn't hit the limit
        if (rows.length < limit) {
          const api = await initSpotify();
          const exclude = new Set(rows.map(r => r.spotifyId));
          const more = await getTracksFromMoodSearchOnly(api, normalizedMood, limit - rows.length, exclude);
          rows = rows.concat(more);
        }

        const final = rows.slice(0, limit);
        const sourceLabel = hasPrefs
          ? 'personalized: top-tracks + artist-based + preference-queries'
          : 'semi-personalized: preference-queries only';

        logSongSource(
          `Final: ${final.length} track(s) via ${sourceLabel} (source=personalized; ${final.filter(t => t.videoId).length} with bundled YouTube videoIds)`
        );
        console.log(
          `[Spotify] ✅ ${sourceLabel}: ${final.length} tracks for mood=${normalizedMood}`
        );
        return { tracks: final, source: 'personalized', playlist: null };
      }

      logSongSource(
        `Personalized search returned only ${personalizedTracks.length} track(s) — falling back to generic mood search`
      );
    } catch (err) {
      logSongSource(
        `Personalized search error (${err.message || err}) — falling back to generic mood search`
      );
      console.warn('[Spotify] Personalized flow failed:', err.message || err);
    }
  }

  // ── Step 2: Generic mood keyword search via client credentials ──
  try {
    const api = await initSpotify();
    const final = await getTracksFromMoodSearchOnly(api, normalizedMood, limit, new Set());
    if (final.length > 0) {
      logSongSource(
        `Final: ${final.length} track(s) via generic: mood keyword search (source=spotify; ${final.filter((t) => t.videoId).length} with bundled YouTube videoIds)`
      );
      console.log(
        `[Spotify] ✅ generic: mood keyword search — ${final.length} tracks for mood=${normalizedMood} (${final.filter((t) => t.videoId).length} with known videoIds)`
      );
      return { tracks: final, source: 'spotify', playlist: null };
    }
    logSongSource(
      `Spotify track search returned 0 usable tracks for mood="${normalizedMood}" — using built-in FALLBACK_DATA`
    );
  } catch (err) {
    const code = err.statusCode || err.status || 'unknown';
    logSongSource(`Spotify track search failed (${code}) — using built-in FALLBACK_DATA`);
    console.warn(`[Spotify] API error (${code}), using fallback data`);
  }

  // ── Step 3: Static fallback ─────────────────────────────────
  logSongSource(
    `Final: fallback: FALLBACK_DATA — Spotify unavailable or empty (source=fallback, mood=${normalizedMood})`
  );
  console.log(`[Spotify] Using fallback data for mood: ${normalizedMood}`);
  const fallback = FALLBACK_DATA[normalizedMood] || FALLBACK_DATA.happy;
  return { tracks: fallback.slice(0, limit), source: 'fallback', playlist: null };
}

/**
 * Curated fallback data — guaranteed YouTube videoIds.
 * Used when Spotify API is completely unreachable.
 */
const FALLBACK_DATA = {
  happy: [
    { title: 'Happy', artist: 'Pharrell Williams', spotifyId: 'fakeid1', albumArt: '', duration: '4:00', durationMs: 240000, videoId: 'ZbZSe6N_BXs' },
    { title: "Can't Stop the Feeling!", artist: 'Justin Timberlake', spotifyId: 'fakeid2', albumArt: '', duration: '4:02', durationMs: 242000, videoId: 'ru0K8uYEZWw' },
    { title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', spotifyId: 'fakeid3', albumArt: '', duration: '4:31', durationMs: 271000, videoId: 'OPf0YbXqDm0' },
    { title: 'Shake It Off', artist: 'Taylor Swift', spotifyId: 'fakeid4', albumArt: '', duration: '3:39', durationMs: 219000, videoId: 'nfWlot6h_JM' },
    { title: 'Blinding Lights', artist: 'The Weeknd', spotifyId: 'fakeid5', albumArt: '', duration: '3:20', durationMs: 200000, videoId: '4NRXx6U8ABQ' },
  ],
  sad: [
    { title: 'Someone Like You', artist: 'Adele', spotifyId: 'fakeids1', albumArt: '', duration: '4:45', durationMs: 285000, videoId: 'hLQl3WQQoQ0' },
    { title: 'Fix You', artist: 'Coldplay', spotifyId: 'fakeids2', albumArt: '', duration: '4:55', durationMs: 295000, videoId: 'k4V3Mo61fJM' },
    { title: 'Someone You Loved', artist: 'Lewis Capaldi', spotifyId: 'fakeids3', albumArt: '', duration: '3:02', durationMs: 182000, videoId: 'bCuhuePlP8o' },
    { title: 'Let Her Go', artist: 'Passenger', spotifyId: 'fakeids4', albumArt: '', duration: '4:13', durationMs: 253000, videoId: 'RBumgq5yVrA' },
    { title: 'The Night We Met', artist: 'Lord Huron', spotifyId: 'fakeids5', albumArt: '', duration: '3:28', durationMs: 208000, videoId: 'KtlgYxa6BMU' },
  ],
  excited: [
    { title: 'Eye of the Tiger', artist: 'Survivor', spotifyId: 'fakeide1', albumArt: '', duration: '4:05', durationMs: 245000, videoId: 'btPJPFnesV4' },
    { title: "Don't Stop Me Now", artist: 'Queen', spotifyId: 'fakeide2', albumArt: '', duration: '3:30', durationMs: 210000, videoId: 'HgzGwKwLmgM' },
    { title: 'Lose Yourself', artist: 'Eminem', spotifyId: 'fakeide3', albumArt: '', duration: '5:30', durationMs: 330000, videoId: '_Yhyp-_hX2s' },
    { title: 'Stronger', artist: 'Kanye West', spotifyId: 'fakeide4', albumArt: '', duration: '5:12', durationMs: 312000, videoId: 'PsO6ZnUZI0g' },
    { title: 'Radioactive', artist: 'Imagine Dragons', spotifyId: 'fakeide5', albumArt: '', duration: '3:07', durationMs: 187000, videoId: 'ktvTqknDobU' },
  ],
  angry: [
    { title: 'In the End', artist: 'Linkin Park', spotifyId: 'fakeida1', albumArt: '', duration: '3:36', durationMs: 216000, videoId: 'eVTXPUF4Oz4' },
    { title: 'Numb', artist: 'Linkin Park', spotifyId: 'fakeida2', albumArt: '', duration: '3:07', durationMs: 187000, videoId: 'kXYiU_JCYtU' },
    { title: 'Chop Suey!', artist: 'System of a Down', spotifyId: 'fakeida3', albumArt: '', duration: '3:30', durationMs: 210000, videoId: 'CSvFpBOe8eY' },
    { title: 'Down with the Sickness', artist: 'Disturbed', spotifyId: 'fakeida4', albumArt: '', duration: '4:39', durationMs: 279000, videoId: '09LTT0xwdfw' },
    { title: 'Last Resort', artist: 'Papa Roach', spotifyId: 'fakeida5', albumArt: '', duration: '3:19', durationMs: 199000, videoId: 'j0lSpNtjPM8' },
  ],
  calm: [
    { title: 'Weightless', artist: 'Marconi Union', spotifyId: 'fakeidc1', albumArt: '', duration: '8:09', durationMs: 489000, videoId: 'UfcAVejslrU' },
    { title: 'Sunset Lover', artist: 'Petit Biscuit', spotifyId: 'fakeidc2', albumArt: '', duration: '3:41', durationMs: 221000, videoId: 'wuCK-oiE3rM' },
    { title: 'River Flows in You', artist: 'Yiruma', spotifyId: 'fakeidc3', albumArt: '', duration: '3:45', durationMs: 225000, videoId: '7maJOI3QMu0' },
    { title: 'Experience', artist: 'Ludovico Einaudi', spotifyId: 'fakeidc4', albumArt: '', duration: '5:15', durationMs: 315000, videoId: 'hN_q-_nGv4U' },
    { title: 'Breathe Me', artist: 'Sia', spotifyId: 'fakeidc5', albumArt: '', duration: '4:35', durationMs: 275000, videoId: 'ghPcYqn0p4Y' },
  ],
  relaxed: [
    { title: 'Sunset Lover', artist: 'Petit Biscuit', spotifyId: 'fakeidrl1', albumArt: '', duration: '3:41', durationMs: 221000, videoId: 'wuCK-oiE3rM' },
    { title: 'River Flows in You', artist: 'Yiruma', spotifyId: 'fakeidrl2', albumArt: '', duration: '3:45', durationMs: 225000, videoId: '7maJOI3QMu0' },
    { title: 'Weightless', artist: 'Marconi Union', spotifyId: 'fakeidrl3', albumArt: '', duration: '8:09', durationMs: 489000, videoId: 'UfcAVejslrU' },
    { title: 'Breathe Me', artist: 'Sia', spotifyId: 'fakeidrl4', albumArt: '', duration: '4:35', durationMs: 275000, videoId: 'ghPcYqn0p4Y' },
    { title: 'Somewhere Over the Rainbow', artist: "Israel Kamakawiwo'ole", spotifyId: 'fakeidrl5', albumArt: '', duration: '5:04', durationMs: 304000, videoId: 'V1bFr2SWP1I' },
  ],
  anxious: [
    { title: 'Lean on Me', artist: 'Bill Withers', spotifyId: 'fakeidx1', albumArt: '', duration: '4:22', durationMs: 262000, videoId: 'fOZ-MySzAQo' },
    { title: 'Here Comes the Sun', artist: 'The Beatles', spotifyId: 'fakeidx2', albumArt: '', duration: '3:05', durationMs: 185000, videoId: 'KQetemT1sWc' },
    { title: 'Three Little Birds', artist: 'Bob Marley', spotifyId: 'fakeidx3', albumArt: '', duration: '3:00', durationMs: 180000, videoId: 'zaGUr6wDTO0' },
    { title: "Don't Worry Be Happy", artist: 'Bobby McFerrin', spotifyId: 'fakeidx4', albumArt: '', duration: '4:50', durationMs: 290000, videoId: 'd-diB65scQU' },
    { title: 'What a Wonderful World', artist: 'Louis Armstrong', spotifyId: 'fakeidx5', albumArt: '', duration: '2:21', durationMs: 141000, videoId: 'A3yCcXgbKrE' },
  ],
  lonely: [
    { title: 'Lonely', artist: 'Akon', spotifyId: 'fakeidl1', albumArt: '', duration: '4:25', durationMs: 265000, videoId: '6EEW-9NDM5k' },
    { title: 'Mad World', artist: 'Gary Jules', spotifyId: 'fakeidl2', albumArt: '', duration: '3:08', durationMs: 188000, videoId: '4N3N1MlvVhw' },
    { title: 'Creep', artist: 'Radiohead', spotifyId: 'fakeidl3', albumArt: '', duration: '3:58', durationMs: 238000, videoId: 'XFkzRNyygfk' },
    { title: 'Wish You Were Here', artist: 'Pink Floyd', spotifyId: 'fakeidl4', albumArt: '', duration: '5:34', durationMs: 334000, videoId: 'IXdNnw99-Ic' },
    { title: 'Hallelujah', artist: 'Jeff Buckley', spotifyId: 'fakeidl5', albumArt: '', duration: '6:53', durationMs: 413000, videoId: 'y8AWFf7EAc4' },
  ],
  focused: [
    { title: 'Experience', artist: 'Ludovico Einaudi', spotifyId: 'fakeidf1', albumArt: '', duration: '5:15', durationMs: 315000, videoId: 'hN_q-_nGv4U' },
    { title: 'Time', artist: 'Hans Zimmer', spotifyId: 'fakeidf2', albumArt: '', duration: '4:35', durationMs: 275000, videoId: 'RxabLA7UQ9k' },
    { title: 'Intro', artist: 'The xx', spotifyId: 'fakeidf3', albumArt: '', duration: '2:07', durationMs: 127000, videoId: 'xMV6l2y67rk' },
    { title: 'Strobe', artist: 'Deadmau5', spotifyId: 'fakeidf4', albumArt: '', duration: '10:37', durationMs: 637000, videoId: 'tKi9Z-f6qX4' },
    { title: 'River Flows in You', artist: 'Yiruma', spotifyId: 'fakeidf5', albumArt: '', duration: '3:45', durationMs: 225000, videoId: '7maJOI3QMu0' },
  ],
  romantic: [
    { title: 'Perfect', artist: 'Ed Sheeran', spotifyId: 'fakeidr1', albumArt: '', duration: '4:23', durationMs: 263000, videoId: '2Vv-BfVoq4g' },
    { title: 'All of Me', artist: 'John Legend', spotifyId: 'fakeidr2', albumArt: '', duration: '5:00', durationMs: 300000, videoId: '450p7goxZqg' },
    { title: 'Thinking Out Loud', artist: 'Ed Sheeran', spotifyId: 'fakeidr3', albumArt: '', duration: '4:41', durationMs: 281000, videoId: 'lp-EO5I60KA' },
    { title: 'A Thousand Years', artist: 'Christina Perri', spotifyId: 'fakeidr4', albumArt: '', duration: '4:45', durationMs: 285000, videoId: 'rtOvBOTyX00' },
    { title: "Can't Help Falling in Love", artist: 'Elvis Presley', spotifyId: 'fakeidr5', albumArt: '', duration: '3:00', durationMs: 180000, videoId: 'vGJTaP6anOU' },
  ],
  neutral: [
    { title: 'Blinding Lights', artist: 'The Weeknd', spotifyId: 'fakeidn1', albumArt: '', duration: '3:20', durationMs: 200000, videoId: '4NRXx6U8ABQ' },
    { title: 'Bohemian Rhapsody', artist: 'Queen', spotifyId: 'fakeidn2', albumArt: '', duration: '5:55', durationMs: 355000, videoId: 'fJ9rUzIMcZQ' },
    { title: 'Rolling in the Deep', artist: 'Adele', spotifyId: 'fakeidn3', albumArt: '', duration: '3:48', durationMs: 228000, videoId: 'rYEDA3JcQqw' },
    { title: 'Take Me to Church', artist: 'Hozier', spotifyId: 'fakeidn4', albumArt: '', duration: '4:01', durationMs: 241000, videoId: 'PVjiKRfKpPI' },
    { title: 'Viva la Vida', artist: 'Coldplay', spotifyId: 'fakeidn5', albumArt: '', duration: '4:01', durationMs: 241000, videoId: 'dvgZkm1xWPE' },
  ],
};

module.exports = {
  getRecommendationsByMood,
  validateSpotifyUserToken,
  MOOD_SEARCH_QUERIES,
};
