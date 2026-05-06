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
    return res.json(result);
  } catch (err) {
    console.error('[detectController] Face detection error:', err.message);
    return res.status(502).json({
      error: 'Emotion detection service unavailable',
      message: err.message,
    });
  }
}

module.exports = { handleDetectText, handleDetectFace };
