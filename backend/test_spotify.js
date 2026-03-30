require('dotenv').config();
const SpotifyWebApi = require('spotify-web-api-node');

async function test() {
  const api = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  const auth = await api.clientCredentialsGrant();
  api.setAccessToken(auth.body['access_token']);
  const token = auth.body['access_token'];
  console.log('Token OK:', token.substring(0, 20) + '...\n');

  // Test 1: Simple single-word search via the SDK
  console.log('--- Test 1: SDK searchTracks("happy") ---');
  try {
    const r = await api.searchTracks('happy', { limit: 2 });
    console.log('Result:', r.body.tracks?.items?.length, 'tracks');
  } catch (e) {
    console.log('Error:', e.statusCode, JSON.stringify(e.body));
  }

  // Test 2: Direct API call via fetch to bypass SDK issues
  console.log('\n--- Test 2: Direct fetch search ---');
  try {
    const res = await fetch(
      'https://api.spotify.com/v1/search?q=happy&type=track&limit=3',
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    console.log('Status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('Tracks:', data.tracks?.items?.length);
      data.tracks?.items?.forEach(t =>
        console.log(`  - ${t.name} by ${t.artists[0]?.name}`)
      );
    } else {
      const err = await res.text();
      console.log('Error body:', err);
    }
  } catch (e) {
    console.log('Fetch error:', e.message);
  }

  // Test 3: Get a specific track by ID (simplest test)
  console.log('\n--- Test 3: Get specific track ---');
  try {
    const t = await api.getTrack('4cOdK2wGLETKBW3PvgPWqT'); // Happy by Pharrell
    console.log('Track:', t.body.name, 'by', t.body.artists[0]?.name);
  } catch (e) {
    console.log('Error:', e.statusCode, JSON.stringify(e.body));
  }
}

test().catch(e => console.error('Fatal:', e));
