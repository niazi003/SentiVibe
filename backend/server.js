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
 *   GET  /api/recommendations?mood=happy  — Mood-based music (Spotify + YouTube)
 *   POST /api/chat                        — AI chatbot (Python/LLaMA)
 *   POST /api/recommend                   — Personalized recommendations
 *   POST /api/feedback                    — Track feedback (like/skip)
 *   POST /api/detect/text                 — Emotion from text
 *   POST /api/detect/face                 — Emotion from camera image
 *   POST /api/auth/swap                   — Spotify OAuth token swap
 *   POST /api/auth/refresh                — Spotify OAuth token refresh
 *   POST /api/cache/clear                 — Dev: clear recommendation cache
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
const { getRecommendationsByMood } = require('./services/spotify');
const { findVideosForTracks, searchVideo } = require('./services/youtube');
const { swapToken, refreshToken } = require('./services/auth');

// ── Route imports ─────────────────────────────────────────────
const chatRoutes = require('./routes/chat');
const recommendRoutes = require('./routes/recommend');
const feedbackRoutes = require('./routes/feedback');
const detectRoutes = require('./routes/detect');

const app = express();
const PORT = process.env.PORT || 3001;

// Cache results for 1 hour to avoid repeated API calls
// Each mood gets its own cache entry
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

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
// GET /api/recommendations?mood=happy&limit=10
// Pipeline: mood → Spotify search → YouTube video lookup → merged result
app.get('/api/recommendations', async (req, res) => {
  try {
    const { mood, limit = 10 } = req.query;

    if (!mood) {
      return res.status(400).json({
        error: 'Missing required parameter: mood',
        example: '/api/recommendations?mood=happy',
      });
    }

    const cacheKey = `recommendations_${mood.toLowerCase()}_${limit}`;

    // Check cache first — avoid burning API quota
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] HIT for mood: ${mood}`);
      return res.json({
        mood: mood.toLowerCase(),
        tracks: cached,
        cached: true,
        count: cached.length,
      });
    }

    console.log(`[Cache] MISS for mood: ${mood}, fetching fresh data...`);

    // Step 1: Get track recommendations from Spotify (or fallback)
    const { tracks: spotifyTracks, source } = await getRecommendationsByMood(
      mood,
      parseInt(limit)
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

    // Cache the merged results
    cache.set(cacheKey, mergedTracks);

    res.json({
      mood: mood.toLowerCase(),
      tracks: mergedTracks,
      cached: false,
      count: mergedTracks.length,
      source, // 'spotify' or 'fallback'
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
  console.log(`   Chat (AI):       http://localhost:${PORT}/api/chat`);
  console.log(`   Detection:       http://localhost:${PORT}/api/detect/text`);
  console.log(`   Feedback:        http://localhost:${PORT}/api/feedback\n`);
});
