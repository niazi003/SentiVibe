/**
 * controllers/chatController.js
 * Handles POST /api/chat  –  sends user message to AI service,
 * returns { reply, detectedEmotion } to the client.
 */

const aiClient = require('../ai_client');
const userService = require('../services/userService');

/**
 * POST /api/chat
 * Body: { userId: string, message: string }
 */
async function handleChat(req, res) {
  const { userId, message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: 'userId and message are required.' });
  }

  try {
    // Call Python AI microservice (LLaMA + RAG)
    const aiResponse = await aiClient.chat(userId, message);

    // Persist detected emotion to user mood history
    if (aiResponse.detectedEmotion) {
      userService.appendMoodHistory(userId, aiResponse.detectedEmotion);
    }

    return res.json({
      reply: aiResponse.reply,
      detectedEmotion: aiResponse.detectedEmotion,
    });
  } catch (err) {
    console.error('[chatController] AI service error:', err.message);
    return res.status(502).json({
      error: 'AI service unavailable',
      message: err.message,
    });
  }
}

module.exports = { handleChat };
