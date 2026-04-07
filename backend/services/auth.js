/**
 * Spotify Auth Service — Token Swap & Refresh
 *
 * Handles the Authorization Code flow server-side:
 * - POST /api/auth/swap   → Exchange auth code for access + refresh tokens
 * - POST /api/auth/refresh → Get new access token using refresh token
 *
 * This keeps CLIENT_SECRET on the server (never in the mobile app).
 */

const axios = require('axios');

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = 'sentivibe://spotify-callback';

/**
 * Exchange authorization code for tokens.
 */
async function swapToken(code) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const response = await axios.post(SPOTIFY_TOKEN_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return response.data;
}

/**
 * Refresh an expired access token.
 */
async function refreshToken(refresh_token) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const response = await axios.post(SPOTIFY_TOKEN_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return response.data;
}

module.exports = { swapToken, refreshToken };
