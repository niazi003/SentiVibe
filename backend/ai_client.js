/**
 * ai_client.js
 * Bridge between Node.js backend and the Python AI (Flask) microservice.
 *
 * Wraps all communication with /chat on the Python service.
 * Provides timeout handling and fallback responses if AI is unavailable.
 */

const axios = require('axios');

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
 * @returns {Promise<{ emotion: string }>}
 */
async function detectFaceEmotion(imageBase64) {
  try {
    const response = await axios.post(
      `${EMOTION_SERVICE_URL}/detect-face`,
      { image: imageBase64 },
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

module.exports = { chat, detectTextEmotion, detectFaceEmotion };
