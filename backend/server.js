/**
 * SentiVibe Backend Server
 * 
 * Express API that orchestrates:
 * 1. Spotify API — mood-based track recommendations
 * 2. YouTube API — find music video IDs for each track
 * 3. Python AI service — LLaMA 3 chatbot with RAG
 * 4. Python Emotion Detection — text/face/voice ML models
 * 5. User profiles & feedback tracking
 * 6. Caching — avoid redundant API calls (1 hour TTL)
 * 
 * All services are proxied through this single backend.
 * The mobile app only needs to talk to THIS server.
 * 
 * Endpoints:
 *   GET  /api/health                      — Health check (all services)
 *   GET  /api/recommendations?mood=happy  — Mood-based music (optional Bearer: Spotify user token for playlist mode)
 *   POST /api/chat                        — AI chatbot (Python/LLaMA)
 *   POST /api/recommend                   — Personalized recommendations
 *   POST /api/feedback                    — Track feedback (like/skip)
 *   POST /api/detect/text                 — Emotion from text
 *   POST /api/detect/face                 — Emotion from camera image
 *   POST /api/detect/voice                — Emotion from short audio (multipart)
 *   POST /api/auth/swap                   — Spotify OAuth token swap
 *   POST /api/auth/refresh                — Spotify OAuth token refresh
 *   POST /api/cache/clear                 — Dev: clear recommendation cache
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
const crypto = require('crypto');
const { getRecommendationsByMood, validateSpotifyUserToken } = require('./services/spotify');
const { findVideosForTracks, searchVideo, searchTrailer } = require('./services/youtube');
const { recommendMovies } = require('./ai_client');
const { swapToken, refreshToken } = require('./services/auth');
const { getPreferences, savePreferences } = require('./services/userPreferences');
const SpotifyWebApi = require('spotify-web-api-node');

// ── Route imports ─────────────────────────────────────────────
const chatRoutes = require('./routes/chat');
const recommendRoutes = require('./routes/recommend');
const feedbackRoutes = require('./routes/feedback');
const detectRoutes = require('./routes/detect');

const app = express();
const PORT = process.env.PORT || 3001;

// Cache results for 1 hour to avoid redundant API calls
// Each mood gets its own cache entry
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// ── Movie Poster Fetcher (OMDB API — IMDb Posters) ─────────
/**
 * Fetches a real movie poster URL using the OMDB API (IMDb data).
 * Provide OMDB_API_KEY in .env, or it will use a standard public fallback key.
 * Returns null if no poster is found — caller keeps the placeholder.
 */
async function fetchMoviePoster(title) {
  try {
    const apiKey = process.env.OMDB_API_KEY || 'thewdb';
    const query = encodeURIComponent(title);
    
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    
    const response = await fetch(
      `http://www.omdbapi.com/?apikey=${apiKey}&t=${query}`,
      { signal: ctrl.signal }
    );
    clearTimeout(t);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.Response === 'True' && data.Poster && data.Poster !== 'N/A') {
      return data.Poster;
    }
    return null;
  } catch {
    return null;
  }
}

// Enable CORS for React Native (all origins in dev)
app.use(cors());
app.use(express.json({ limit: '10mb' })); // increased for base64 images

// ── Health Check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      spotify: !!process.env.SPOTIFY_CLIENT_ID,
      youtube:
        !!process.env.YOUTUBE_API_KEY &&
        process.env.YOUTUBE_API_KEY !== 'YOUR_YOUTUBE_API_KEY_HERE',
      ai: !!process.env.AI_SERVICE_URL,
      emotion: !!process.env.EMOTION_SERVICE_URL,
    },
  });
});

// ── Mobile App: Mood-based Recommendations ────────────────────
// GET /api/recommendations?mood=happy&limit=50
// Optional: Authorization: Bearer <Spotify user access token> for playlist-based personalization
// Pipeline: mood → (optional) Spotify personalized playlists → track search → merged result
app.get('/api/recommendations', async (req, res) => {
  try {
    const { mood, limit = 50 } = req.query;

    if (!mood) {
      return res.status(400).json({
        error: 'Missing required parameter: mood',
        example: '/api/recommendations?mood=happy',
      });
    }

    const moodNorm = mood.toLowerCase();
    // Enforce a "good default" list size for UX.
    // If the client sends limit=10, we still return 50 (user asked for 50).
    const rawLimit = parseInt(String(limit), 10);
    const limitNum = Number.isFinite(rawLimit)
      ? Math.min(50, Math.max(50, rawLimit))
      : 50;

    let cachePartition = 'anon';
    let userAccessToken = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const raw = authHeader.slice(7).trim();
      if (raw) {
        const valid = await validateSpotifyUserToken(raw);
        if (valid) {
          userAccessToken = raw;
          cachePartition = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 12);
        } else {
          console.warn('[API] Ignoring invalid Spotify Bearer on /recommendations');
        }
      }
    }

    const cacheKey = `recommendations_${moodNorm}_${limitNum}_${cachePartition}`;

    // Check cache first — avoid burning API quota
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] HIT for mood: ${mood}`);
      const tracks = Array.isArray(cached) ? cached : cached.tracks;
      const source = cached.source ?? 'spotify';
      const playlist = cached.playlist ?? null;
      console.log(
        `[Song source] /api/recommendations cache HIT — ${tracks.length} track(s), source=${source}` +
          (playlist?.name ? `, was playlist="${playlist.name}"` : '')
      );
      return res.json({
        mood: moodNorm,
        tracks,
        cached: true,
        count: tracks.length,
        source,
        playlist,
      });
    }

    console.log(`[Cache] MISS for mood: ${mood}, fetching fresh data...`);

    // Step 1: Get track recommendations from Spotify (or fallback)
    const { tracks: spotifyTracks, source, playlist } = await getRecommendationsByMood(
      mood,
      limitNum,
      { userAccessToken }
    );

    if (!spotifyTracks || spotifyTracks.length === 0) {
      return res.status(404).json({
        error: 'No recommendations found for this mood',
        mood: mood.toLowerCase(),
      });
    }

    // Step 2: Merge Spotify data into final response
    // We no longer search YouTube for all tracks upfront to save API quota.
    // The mobile app will request videoIds on-demand when the user presses play.
    const mergedTracks = spotifyTracks.map((track, index) => {
      return {
        id: index + 1,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        durationMs: track.durationMs,
        spotifyId: track.spotifyId,
        cover: track.albumArt,
        albumArt: track.albumArt,
        videoId: track.videoId || null,
        youtubeTitle: null,
        videoUrl: track.videoId
          ? `https://www.youtube.com/watch?v=${track.videoId}`
          : null,
      };
    });

    // Cache the merged results (store source + playlist for cache hits)
    cache.set(cacheKey, { tracks: mergedTracks, source, playlist: playlist || null });

    console.log(
      `[Song source] /api/recommendations fresh fetch — ${mergedTracks.length} track(s), source=${source}` +
        (playlist?.name ? `, playlist="${playlist.name}"` : '')
    );

    res.json({
      mood: moodNorm,
      tracks: mergedTracks,
      cached: false,
      count: mergedTracks.length,
      source,
      playlist: playlist || null,
    });
  } catch (error) {
    // Spotify SDK throws objects with body/statusCode, not standard Errors
    console.error('[Server] Full error:', JSON.stringify(error, null, 2));
    const errMsg =
      error.message ||
      error.body?.error?.message ||
      (typeof error === 'object' ? JSON.stringify(error) : String(error));
    const errCode = error.statusCode || error.body?.error?.status || 500;
    console.error(
      '[Server] Recommendation error:',
      errMsg,
      '| Status:',
      errCode
    );

    if (
      errCode === 401 ||
      errMsg?.includes('401') ||
      errMsg?.includes('Unauthorized')
    ) {
      return res.status(401).json({
        error: 'Spotify authentication failed. Check your API credentials.',
      });
    }

    res.status(500).json({
      error: 'Failed to fetch recommendations',
      message: errMsg,
    });
  }
});

// ── Mobile App: Mood-based Movie Recommendations (CSV + TF-IDF) ──
// GET /api/recommendations/movies?mood=Sad&limit=6&text=optional&movieGenres=["Drama"]&movieNightVibe=drama_romance
app.get('/api/recommendations/movies', async (req, res) => {
  try {
    const { mood, limit = 20, text = '', movieGenres: rawGenres = '', movieNightVibe = '' } = req.query;

    if (!mood) {
      return res.status(400).json({
        error: 'Missing required parameter: mood',
        example: '/api/recommendations/movies?mood=Sad',
      });
    }

    // Parse movieGenres — may arrive as JSON string "["Drama","Sci-Fi"]" or CSV
    let movieGenres = [];
    if (rawGenres) {
      try {
        movieGenres = JSON.parse(rawGenres);
      } catch {
        movieGenres = String(rawGenres).split(',').map(g => g.trim()).filter(Boolean);
      }
    }

    const moodNorm = String(mood).trim();
    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 20));
    // ⚠️  No list-level cache here — the Python recommender uses weighted random
    // sampling so each call intentionally returns a different mix of movies.
    // Per-title poster and trailer results are still cached individually below.

    const { movies: rawMovies } = await recommendMovies(
      moodNorm,
      String(text),
      limitNum,
      movieGenres,
      String(movieNightVibe),
    );

    if (!rawMovies || rawMovies.length === 0) {
      return res.status(404).json({
        error: 'No movie recommendations found for this mood',
        mood: moodNorm,
      });
    }

    const enriched = await Promise.all(
      rawMovies.map(async (movie, index) => {
        let videoId = null;
        let videoUrl = null;
        let trailer = null;

        // ── YouTube trailer ──────────────────────────────────────
        const ytKey = `yt_trailer_${movie.title}`.toLowerCase().replace(/\s+/g, '_');
        const ytCached = cache.get(ytKey);
        if (ytCached?.videoId) {
          videoId = ytCached.videoId;
        } else {
          const yt = await searchTrailer(movie.title);
          if (yt?.videoId) {
            videoId = yt.videoId;
            cache.set(ytKey, yt, 86400);
          }
        }

        if (videoId) {
          videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
          trailer = videoUrl;
        }

        // ── Real movie poster (OMDB API) ────────────────────────
        const posterKey = `poster_${movie.title.toLowerCase().replace(/\s+/g, '_')}`;
        let coverUrl = movie.cover; // placeholder default
        const cachedPoster = cache.get(posterKey);
        if (cachedPoster) {
          coverUrl = cachedPoster;
        } else {
          const itunes = await fetchMoviePoster(movie.title);
          if (itunes) {
            coverUrl = itunes;
            cache.set(posterKey, itunes, 86400 * 7); // cache poster for 7 days
          }
        }

        return {
          id: movie.id ?? index + 1,
          title: movie.title,
          artist: movie.genres || 'Film',
          duration: movie.duration || 'Feature',
          cover: coverUrl,
          description: movie.description,
          rating: movie.rating,
          emotion: movie.emotion,
          videoId,
          videoUrl,
          trailer,
        };
      })
    );

    console.log(`[Movies] ${enriched.length} picks for mood=${moodNorm}${movieGenres.length ? `, genres=${movieGenres.join(',')}` : ''}${movieNightVibe ? `, vibe=${movieNightVibe}` : ''}`);

    return res.json({
      mood: moodNorm,
      movies: enriched,
      cached: false,
      count: enriched.length,
    });
  } catch (err) {
    console.error('[API] Movie recommendations error:', err.message);
    return res.status(502).json({
      error: 'Failed to fetch movie recommendations',
      message: err.message,
    });
  }
});

// ── Spotify Auth (Mobile OAuth flow) ──────────────────────────
// ── YouTube Auth & On-Demand Search ──────────────────────────
app.get('/api/youtube-search', async (req, res) => {
  try {
    const { title, artist } = req.query;
    if (!title || !artist) {
      return res.status(400).json({ error: 'Missing title or artist' });
    }

    const cacheKey = `yt_${title}_${artist}`.toLowerCase().replace(/\s+/g, '_');
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const result = await searchVideo(title, artist);
    if (result) {
      cache.set(cacheKey, result, 86400); // Cache for 24 hours (86400 seconds)
      return res.json(result);
    }
    res.status(404).json({ error: 'Video not found' });
  } catch (error) {
    console.error('[YouTube Search] Failed:', error);
    res.status(500).json({ error: 'Failed to search YouTube' });
  }
});

app.post('/api/auth/swap', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }
    const tokens = await swapToken(code);
    res.json(tokens);
  } catch (error) {
    console.error(
      '[Auth] Token swap error:',
      error.response?.data || error.message
    );
    res.status(error.response?.status || 500).json({
      error: 'Token swap failed',
      message: error.response?.data?.error_description || error.message,
    });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: 'Missing refresh token' });
    }
    const tokens = await refreshToken(refresh_token);
    res.json(tokens);
  } catch (error) {
    console.error(
      '[Auth] Token refresh error:',
      error.response?.data || error.message
    );
    res.status(error.response?.status || 500).json({
      error: 'Token refresh failed',
      message: error.response?.data?.error_description || error.message,
    });
  }
});

// ── User Preferences ──────────────────────────────────────────

/**
 * Extract Spotify user ID from a Bearer token.
 * Returns null if the token is invalid or missing.
 */
async function getSpotifyUserId(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  try {
    const api = new SpotifyWebApi({ accessToken: token });
    const me = await api.getMe();
    return me.body?.id || null;
  } catch {
    return null;
  }
}

// GET /api/user/preferences — read preferences for the authenticated user
app.get('/api/user/preferences', async (req, res) => {
  try {
    const userId = await getSpotifyUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Valid Spotify Bearer token required' });
    }
    const prefs = getPreferences(userId);
    res.json(prefs);
  } catch (error) {
    console.error('[Preferences] GET error:', error.message || error);
    res.status(500).json({ error: 'Failed to read preferences' });
  }
});

// POST /api/user/preferences — save/update preferences for the authenticated user
app.post('/api/user/preferences', async (req, res) => {
  try {
    const userId = await getSpotifyUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Valid Spotify Bearer token required' });
    }

    const {
      genres,
      favoriteArtists,
      energyPreference,
      languagePreference,
      decadePreference,
      movieGenres,
      movieNightVibe,
    } = req.body;
    const result = savePreferences(userId, {
      genres,
      favoriteArtists,
      energyPreference,
      languagePreference,
      decadePreference,
      movieGenres,
      movieNightVibe,
    });

    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', details: result.errors });
    }

    // Invalidate cached recommendations for this user so new prefs take effect
    const userHash = crypto.createHash('sha256').update(req.headers.authorization.slice(7).trim()).digest('hex').slice(0, 12);
    const keys = cache.keys();
    let cleared = 0;
    for (const key of keys) {
      if (key.includes(userHash)) {
        cache.del(key);
        cleared++;
      }
    }
    if (cleared > 0) {
      console.log(`[Cache] Cleared ${cleared} cached recommendation(s) for user ${userId} after preference update`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Preferences] POST error:', error.message || error);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

// ── Cache clear (dev utility) ─────────────────────────────────
app.post('/api/cache/clear', (req, res) => {
  cache.flushAll();
  res.json({ message: 'Cache cleared' });
});

// ── AI & Detection Routes (Python microservices) ──────────────
app.use('/api/chat', chatRoutes);
app.use('/api/recommend', recommendRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/detect', detectRoutes);

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[SentiVibe Error]', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎵 SentiVibe backend running on http://localhost:${PORT}`);
  console.log(`   Health:          http://localhost:${PORT}/api/health`);
  console.log(`   Recommendations: http://localhost:${PORT}/api/recommendations?mood=happy`);
  console.log(`   Movies:          http://localhost:${PORT}/api/recommendations/movies?mood=Sad`);
  console.log(`   Chat (AI):       http://localhost:${PORT}/api/chat`);
  console.log(`   Detection:       http://localhost:${PORT}/api/detect/text`);
  console.log(`   Feedback:        http://localhost:${PORT}/api/feedback\n`);
});
