const express = require('express');
const router = express.Router();
const { handleDetectText, handleDetectFace } = require('../controllers/detectController');

router.post('/text', handleDetectText);
router.post('/face', handleDetectFace);

module.exports = router;
