/**
 * ai_client.js
 * Bridge between Node.js backend and the Python AI (Flask) microservice.
 *
 * Wraps all communication with /chat on the Python service.
 * Provides timeout handling and fallback responses if AI is unavailable.
 */

const axios = require('axios');
const FormData = require('form-data');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const EMOTION_SERVICE_URL = process.env.EMOTION_SERVICE_URL || 'http://localhost:5001';
const TIMEOUT_MS = 90_000; // 90 s – LLM inference can be slow on first call (cold start)

/**
 * Send a user message to the Python AI service.
 * @param {string} userId   - unique user identifier
 * @param {string} message  - user's text input
 * @returns {Promise<{ reply: string, detectedEmotion: string }>}
 */
async function chat(userId, message) {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/chat`,
      { userId, message },
      {
        timeout: TIMEOUT_MS,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const { reply, detectedEmotion } = response.data;

    if (!reply) {
      throw new Error('AI service returned empty reply.');
    }

    return {
      reply: reply.trim(),
      detectedEmotion: (detectedEmotion || 'neutral').toLowerCase(),
    };
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      throw new Error(
        'Python AI service is not running. Start it with: python ai_server.py'
      );
    }
    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      throw new Error('AI service timed out. LLM may still be loading – try again.');
    }
    throw err;
  }
}

/**
 * Detect emotion from text using the Emotion Detection microservice.
 * @param {string} text - text to analyze
 * @returns {Promise<{ emotion: string, confidence: number }>}
 */
async function detectTextEmotion(text) {
  try {
    const response = await axios.post(
      `${EMOTION_SERVICE_URL}/detect-text`,
      { text },
      { timeout: 30_000, headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      throw new Error('Emotion detection service is not running. Start it with: python emotion_server.py');
    }
    throw err;
  }
}

/**
 * Detect emotion from a face image (base64 encoded).
 * @param {string} imageBase64 - base64 encoded image
 * @returns {Promise<{ emotion: string } | { error: string, message: string }>}
 *   On success: { emotion, confidence }
 *   On face-guard rejection (HTTP 422): { error: 'no_face_detected'|'multiple_faces_detected', message: string }
 *   On hard failure: throws
 */
async function detectFaceEmotion(imageBase64) {
  try {
    const response = await axios.post(
      `${EMOTION_SERVICE_URL}/detect-face`,
      { image: imageBase64 },
      // 120 s — DeepFace downloads its CNN weights on the first call (~40-90 s).
      // Subsequent calls are fast once the weights are cached on disk.
      // validateStatus: accept 422 so axios does NOT throw for face-guard rejections.
      {
        timeout: 120_000,
        headers: { 'Content-Type': 'application/json' },
        validateStatus: (status) => status === 200 || status === 422,
      }
    );
    // Return the body for both 200 (emotion result) and 422 (face-guard error).
    // The controller will forward the correct status code to the app.
    return { status: response.status, data: response.data };
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      throw new Error('Emotion detection service is not running. Start it with: python emotion_server.py');
    }
    if (err.code === 'ECONNABORTED' || (err.message || '').includes('timeout')) {
      throw new Error('Face detection timed out. The model may still be loading — please try again in a few seconds.');
    }
    // Surface any other Python-level message.
    const pyError = err.response?.data?.error || err.response?.data?.message;
    if (pyError) throw new Error(pyError);
    throw err;
  }
}

/**
 * Forward raw audio bytes to Python /detect-voice (multipart).
 * @param {Buffer} buffer
 * @param {string} originalname
 * @param {string} mimetype
 */
async function detectVoiceEmotion(buffer, originalname, mimetype) {
  try {
    const form = new FormData();
    form.append('audio', buffer, {
      filename: originalname || 'clip.m4a',
      contentType: mimetype || 'application/octet-stream',
    });
    const response = await axios.post(`${EMOTION_SERVICE_URL}/detect-voice`, form, {
      headers: form.getHeaders(),
      timeout: 90_000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return response.data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      throw new Error('Emotion detection service is not running. Start it with: python emotion_server.py');
    }
    const data = err.response?.data;
    const fromPython =
      data && typeof data === 'object'
        ? data.error || data.message
        : typeof data === 'string'
          ? data
          : null;
    throw new Error(fromPython || err.message || 'Voice detection request failed');
  }
}

/**
 * Transcribe speech audio to plain text using Python /transcribe (Distil-Whisper).
 * No emotion scoring — returns only what the user said.
 * @param {Buffer} buffer     - raw audio bytes
 * @param {string} originalname
 * @param {string} mimetype
 * @returns {Promise<{ transcript: string }>}
 */
async function transcribeVoice(buffer, originalname, mimetype) {
  try {
    const form = new FormData();
    form.append('audio', buffer, {
      filename: originalname || 'clip.m4a',
      contentType: mimetype || 'application/octet-stream',
    });
    const response = await axios.post(`${EMOTION_SERVICE_URL}/transcribe`, form, {
      headers: form.getHeaders(),
      timeout: 90_000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return response.data; // { transcript: string }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      throw new Error('Emotion detection service is not running. Start it with: python emotion_server.py');
    }
    const data = err.response?.data;
    const fromPython =
      data && typeof data === 'object'
        ? data.error || data.message
        : typeof data === 'string'
          ? data
          : null;
    throw new Error(fromPython || err.message || 'Transcription request failed');
  }
}

/**
 * Mood-based movie recommendations (Python TF-IDF engine).
 * @param {string} mood - app mood label (e.g. Sad, Happy)
 * @param {string} [userText] - optional chat context
 * @param {number} [limit=6]
 * @param {string[]} [movieGenres] - user preferred genre chips from onboarding
 * @param {string} [movieNightVibe] - user movie-night vibe from onboarding
 */
async function recommendMovies(mood, userText = '', limit = 20, movieGenres = [], movieNightVibe = '') {
  try {
    const params = {
      mood,
      text: userText,
      limit,
    };
    if (movieGenres && movieGenres.length > 0) {
      params.movie_genres = JSON.stringify(movieGenres);
    }
    if (movieNightVibe && movieNightVibe !== 'no preference') {
      params.movie_night_vibe = movieNightVibe;
    }
    const response = await axios.get(`${EMOTION_SERVICE_URL}/recommend-movies`, {
      params,
      timeout: 30_000,
    });
    return response.data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      throw new Error(
        'Emotion/movie service is not running. Start it with: python emotion_server.py'
      );
    }
    const data = err.response?.data;
    const msg =
      data && typeof data === 'object'
        ? data.error || data.message
        : err.message;
    throw new Error(msg || 'Movie recommendation request failed');
  }
}

module.exports = {
  chat,
  detectTextEmotion,
  detectFaceEmotion,
  detectVoiceEmotion,
  transcribeVoice,
  recommendMovies,
};
