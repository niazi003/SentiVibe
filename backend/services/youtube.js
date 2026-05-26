/**
 * YouTube Service
 * 
 * Uses YouTube Data API v3 to find official music videos for tracks.
 * Optimized search queries to prefer official videos and avoid
 * remixes, live versions, and covers.
 */

const axios = require('axios');

// Negative keywords to filter out unwanted video types
const EXCLUDE_KEYWORDS = [
  'remix', 'live', 'cover', 'karaoke', 'instrumental',
  'slowed', 'reverb', 'reaction', 'tutorial', 'lesson',
  'behind the scenes', 'making of', '8d audio'
];

/**
 * Search YouTube for an official music video of a track.
 * 
 * @param {string} title - Song title
 * @param {string} artist - Artist name
 * @returns {{ videoId, youtubeTitle, thumbnail } | null}
 */
async function searchVideo(title, artist) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey || apiKey === 'YOUR_YOUTUBE_API_KEY_HERE') {
    console.warn('[YouTube] No API key configured, skipping search for:', title);
    return null;
  }

  try {
    // Construct search query to maximize chances of finding the official MV
    const query = `${title} ${artist} official music video`;

    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: query,
        type: 'video',
        videoCategoryId: '10', // Music category
        maxResults: 5,         // Get several to filter through
        key: apiKey,
        videoEmbeddable: 'true', // Only videos that can be embedded
      },
    });

    const items = response.data.items || [];

    if (items.length === 0) {
      console.warn('[YouTube] No results for:', query);
      return null;
    }

    // Score and rank results — prefer official videos, penalize unwanted types
    const scored = items.map((item) => {
      const videoTitle = (item.snippet.title || '').toLowerCase();
      const channelTitle = (item.snippet.channelTitle || '').toLowerCase();
      let score = 0;

      // Boost: Official artist channel or VEVO
      if (channelTitle.includes('vevo') || channelTitle.includes(artist.toLowerCase().split(' ')[0])) {
        score += 10;
      }

      // Boost: Title contains "official" keywords
      if (videoTitle.includes('official')) score += 5;
      if (videoTitle.includes('music video')) score += 3;
      if (videoTitle.includes('mv')) score += 2;

      // Penalize: Matches any exclusion keyword
      for (const keyword of EXCLUDE_KEYWORDS) {
        if (videoTitle.includes(keyword)) {
          score -= 15;
          break;
        }
      }

      // Slight boost if title closely matches the track we're looking for
      if (videoTitle.includes(title.toLowerCase())) {
        score += 3;
      }

      return { item, score };
    });

    // Sort by score (highest first) and pick the best match
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].item;

    return {
      videoId: best.id.videoId,
      youtubeTitle: best.snippet.title,
      thumbnail: best.snippet.thumbnails.high?.url ||
                 best.snippet.thumbnails.medium?.url ||
                 best.snippet.thumbnails.default?.url,
    };
  } catch (error) {
    console.error('[YouTube] Search error for', title, ':', error.message);
    return null;
  }
}

/**
 * Find YouTube videos for a batch of tracks.
 * Processes sequentially to avoid rate limiting.
 * 
 * @param {Array<{title, artist}>} tracks - Array of track objects
 * @returns {Array<{videoId, youtubeTitle, thumbnail} | null>}
 */
async function findVideosForTracks(tracks) {
  const results = [];

  for (const track of tracks) {
    const result = await searchVideo(track.title, track.artist);
    results.push(result);

    // Small delay between requests to be respectful to the API
    if (results.length < tracks.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Search YouTube for an official movie trailer.
 * @param {string} movieTitle
 * @returns {{ videoId, youtubeTitle, thumbnail } | null}
 */
async function searchTrailer(movieTitle) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey || apiKey === 'YOUR_YOUTUBE_API_KEY_HERE') {
    console.warn('[YouTube] No API key configured, skipping trailer for:', movieTitle);
    return null;
  }

  try {
    const query = `${movieTitle} official trailer`;

    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: 5,
        key: apiKey,
        videoEmbeddable: 'true',
      },
    });

    const items = response.data.items || [];
    if (items.length === 0) {
      return null;
    }

    const trailerHints = ['trailer', 'teaser', 'preview'];
    const scored = items.map((item) => {
      const title = (item.snippet.title || '').toLowerCase();
      let score = 0;
      if (trailerHints.some((h) => title.includes(h))) score += 8;
      if (title.includes('official')) score += 4;
      if (title.includes(movieTitle.toLowerCase().split(' ')[0])) score += 2;
      for (const keyword of EXCLUDE_KEYWORDS) {
        if (title.includes(keyword)) score -= 10;
      }
      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].item;

    return {
      videoId: best.id.videoId,
      youtubeTitle: best.snippet.title,
      thumbnail:
        best.snippet.thumbnails.high?.url ||
        best.snippet.thumbnails.medium?.url ||
        best.snippet.thumbnails.default?.url,
    };
  } catch (error) {
    console.error('[YouTube] Trailer search error for', movieTitle, ':', error.message);
    return null;
  }
}

module.exports = { searchVideo, findVideosForTracks, searchTrailer };
