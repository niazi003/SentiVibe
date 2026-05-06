const express = require('express');
const router = express.Router();
const { handleRecommend } = require('../controllers/recommendController');

router.post('/', handleRecommend);

module.exports = router;
