const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  handleDetectText,
  handleDetectFace,
  handleDetectVoice,
  handleTranscribe,
} = require('../controllers/detectController');

const voiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.post('/text', handleDetectText);
router.post('/face', handleDetectFace);
router.post('/voice', voiceUpload.single('audio'), handleDetectVoice);
router.post('/transcribe', voiceUpload.single('audio'), handleTranscribe);

module.exports = router;
