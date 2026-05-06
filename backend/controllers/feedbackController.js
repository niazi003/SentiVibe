/**
 * controllers/feedbackController.js
 * Handles POST /api/feedback  –  records user track interactions.
 */

const userService = require('../services/userService');

/**
 * POST /api/feedback
 * Body: { userId, trackId, action: "like"|"dislike"|"skip", mood }
 */
async function handleFeedback(req, res) {
  const { userId, trackId, action, mood } = req.body;

  const validActions = ['like', 'dislike', 'skip'];
  if (!userId || !trackId || !validActions.includes(action)) {
    return res.status(400).json({
      error: `userId, trackId, and action ("like" | "dislike" | "skip") are required.`,
    });
  }

  try {
    userService.updateFeedback(userId, trackId, action, mood);

    return res.json({
      success: true,
      message: `Track "${trackId}" marked as "${action}" for user "${userId}".`,
    });
  } catch (err) {
    console.error('[feedbackController] Error:', err.message);
    return res.status(500).json({ error: 'Failed to record feedback.' });
  }
}

module.exports = { handleFeedback };
