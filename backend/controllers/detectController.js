/**
 * controllers/detectController.js
 * Proxies emotion detection requests to the Python Emotion Service.
 * This way the mobile app only talks to the Node.js backend (single gateway).
 */

const aiClient = require('../ai_client');

/**
 * POST /api/detect/text
 * Body: { text: string }
 */
async function handleDetectText(req, res) {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'text is required.' });
  }

  try {
    const result = await aiClient.detectTextEmotion(text);
    return res.json(result);
  } catch (err) {
    console.error('[detectController] Text detection error:', err.message);
    return res.status(502).json({
      error: 'Emotion detection service unavailable',
      message: err.message,
    });
  }
}

/**
 * POST /api/detect/face
 * Body: { image: string (base64) }
 */
async function handleDetectFace(req, res) {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'image (base64) is required.' });
  }

  try {
    const result = await aiClient.detectFaceEmotion(image);

    // ai_client now returns { status, data } so we can forward 422 face-guard
    // rejections to the app with the correct status code and full error body.
    if (result && result.status !== undefined) {
      return res.status(result.status).json(result.data);
    }

    // Fallback for any older call shape
    return res.json(result);
  } catch (err) {
    console.error('[detectController] Face detection error:', err.message);

    // Specific timeout message so the frontend can show a contextual alert
    if ((err.message || '').toLowerCase().includes('timed out')) {
      return res.status(504).json({
        error: 'face_detection_timeout',
        message: err.message,
      });
    }
    // Server / connection down
    if ((err.message || '').toLowerCase().includes('not running') || err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'emotion_service_unavailable',
        message: 'The emotion detection service is not running. Please start the Python server.',
      });
    }

    return res.status(502).json({
      error: 'face_detection_failed',
      message: err.message || 'An unexpected error occurred during face detection.',
    });
  }
}

/**
 * POST /api/detect/voice
 * Multipart field name: audio
 */
async function handleDetectVoice(req, res) {
  const file = req.file;

  if (!file || !file.buffer?.length) {
    return res.status(400).json({ error: 'audio file is required (multipart field: audio).' });
  }

  try {
    const result = await aiClient.detectVoiceEmotion(
      file.buffer,
      file.originalname,
      file.mimetype
    );
    return res.json(result);
  } catch (err) {
    console.error('[detectController] Voice detection error:', err.message);
    return res.status(502).json({
      error: 'Emotion detection service unavailable',
      message: err.message,
    });
  }
}

/**
 * POST /api/detect/transcribe
 * Multipart field name: audio
 * Returns { transcript: string } — pure speech-to-text, no emotion analysis.
 */
async function handleTranscribe(req, res) {
  const file = req.file;

  if (!file || !file.buffer?.length) {
    return res.status(400).json({ error: 'audio file is required (multipart field: audio).' });
  }

  try {
    const result = await aiClient.transcribeVoice(
      file.buffer,
      file.originalname,
      file.mimetype
    );
    return res.json(result); // { transcript: string }
  } catch (err) {
    console.error('[detectController] Transcription error:', err.message);
    return res.status(502).json({
      error: 'Transcription service unavailable',
      message: err.message,
    });
  }
}

module.exports = { handleDetectText, handleDetectFace, handleDetectVoice, handleTranscribe };
