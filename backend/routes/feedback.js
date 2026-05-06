const express = require('express');
const router = express.Router();
const { handleFeedback } = require('../controllers/feedbackController');

router.post('/', handleFeedback);

module.exports = router;
