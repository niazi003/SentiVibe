/**
 * SentiVibe Backend Server
 * 
 * Express API that orchestrates:
 * 1. Spotify API — mood-based track recommendations
 * 2. YouTube API — find music video IDs for each track
 * 3. Caching — avoid redundant API calls (1 hour TTL)
 * 
 * Main endpoint: GET /api/recommendations?mood=happy
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
const { getRecommendationsByMood } = require('./services/spotify');
const { findVideosForTracks } = require('./services/youtube');
const { swapToken, refreshToken } = require('./services/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Cache results for 1 hour to avoid repeated API calls
// Each mood gets its own cache entry
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Enable CORS for React Native (all origins in dev)
app.use(cors());
app.use(express.json());

// ---------------------
// Health Check Endpoint
// ---------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      spotify: !!process.env.SPOTIFY_CLIENT_ID,
      youtube: !!process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY !== 'YOUR_YOUTUBE_API_KEY_HERE',
    },
  });
});

// --------------------------------
// Main Recommendations Endpoint
// --------------------------------
// GET /api/recommendations?mood=happy&limit=10
//
// Pipeline: mood → Spotify genres → track list → YouTube video search → merged results
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
    const { tracks: spotifyTracks, source } = await getRecommendationsByMood(mood, parseInt(limit));

    if (!spotifyTracks || spotifyTracks.length === 0) {
      return res.status(404).json({
        error: 'No recommendations found for this mood',
        mood: mood.toLowerCase(),
      });
    }

    // Step 2: Find YouTube videos for each track
    // Skip YouTube search if tracks already have videoIds (from fallback data)
    const hasVideoIds = spotifyTracks.some(t => t.videoId);
    const youtubeResults = hasVideoIds
      ? spotifyTracks.map(t => t.videoId ? { videoId: t.videoId, youtubeTitle: t.title, thumbnail: null } : null)
      : await findVideosForTracks(spotifyTracks);

    // Step 3: Merge Spotify + YouTube data into final response
    const mergedTracks = spotifyTracks.map((track, index) => {
      const youtube = youtubeResults[index];
      const videoId = track.videoId || youtube?.videoId || null;
      return {
        id: index + 1,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        durationMs: track.durationMs,
        spotifyId: track.spotifyId,
        cover: youtube?.thumbnail || track.albumArt,
        albumArt: track.albumArt,
        videoId: videoId,
        youtubeTitle: youtube?.youtubeTitle || null,
        videoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
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
    // Log full error for debugging
    console.error('[Server] Full error:', JSON.stringify(error, null, 2));
    const errMsg = error.message || error.body?.error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    const errCode = error.statusCode || error.body?.error?.status || 500;
    console.error('[Server] Recommendation error:', errMsg, '| Status:', errCode);

    // Differentiate between auth errors and other failures
    if (errCode === 401 || errMsg?.includes('401') || errMsg?.includes('Unauthorized')) {
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

// --------------------------------
// Clear cache endpoint (for dev)
// --------------------------------
app.post('/api/cache/clear', (req, res) => {
  cache.flushAll();
  res.json({ message: 'Cache cleared' });
});

// --------------------------------
// Spotify Auth Endpoints
// --------------------------------
app.post('/api/auth/swap', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }
    const tokens = await swapToken(code);
    res.json(tokens);
  } catch (error) {
    console.error('[Auth] Token swap error:', error.response?.data || error.message);
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
    console.error('[Auth] Token refresh error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Token refresh failed',
      message: error.response?.data?.error_description || error.message,
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎵 SentiVibe API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Try:    http://localhost:${PORT}/api/recommendations?mood=happy\n`);
});
