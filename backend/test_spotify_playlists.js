/**
 * Manual test: anonymous track search vs user-token playlist personalization.
 *
 * Optional: set SPOTIFY_USER_ACCESS_TOKEN in backend/.env to a valid Spotify
 * user access token (with playlist-read-private) to exercise /me/playlists + search.
 */

require('dotenv').config();
const SpotifyWebApi = require('spotify-web-api-node');
const {
  getRecommendationsByMood,
  validateSpotifyUserToken,
} = require('./services/spotify');

async function clientCredsPlaylistSearch() {
  const api = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  });
  const auth = await api.clientCredentialsGrant();
  api.setAccessToken(auth.body.access_token);
  const res = await api.searchPlaylists('Angry Mix', { limit: 8, market: 'US' });
  const items = (res.body.playlists?.items || []).filter(Boolean);
  console.log('\n--- Client-credentials playlist search: "Angry Mix" (not user-personalized) ---');
  items.forEach((p) => {
    console.log(`  ${p.name} | owner=${p.owner?.id} | id=${p.id}`);
  });
}

async function main() {
  console.log('Spotify playlist personalization probe\n');

  await clientCredsPlaylistSearch().catch((e) =>
    console.warn('Client-credentials playlist search failed:', e.message || e)
  );

  console.log('\n--- getRecommendationsByMood("angry", 5) without user token ---');
  const anon = await getRecommendationsByMood('angry', 5, {});
  console.log('source:', anon.source, '| tracks:', anon.tracks.length);
  anon.tracks.forEach((t) => console.log(`  - ${t.title} — ${t.artist}`));

  const ut = process.env.SPOTIFY_USER_ACCESS_TOKEN;
  if (!ut) {
    console.log(
      '\n(No SPOTIFY_USER_ACCESS_TOKEN — skip user playlist path. Paste a short-lived user token in backend/.env to test.)'
    );
    return;
  }

  console.log('\n--- User token validation ---');
  const ok = await validateSpotifyUserToken(ut);
  console.log('validateSpotifyUserToken:', ok);
  if (!ok) return;

  console.log('\n--- getRecommendationsByMood("angry", 8) with user token ---');
  const user = await getRecommendationsByMood('angry', 8, { userAccessToken: ut });
  console.log('source:', user.source);
  console.log('playlist meta:', user.playlist);
  console.log('tracks:');
  user.tracks.forEach((t) => console.log(`  - ${t.title} — ${t.artist}`));
}

main().catch((e) => console.error('Fatal:', e));
