"""
emotion_server.py
SentiVibe Emotion Detection Server – runs on port 5001.

Endpoints:
  POST /detect-text   — Emotion from text (DistilRoBERTa)
  POST /detect-face   — Emotion from camera image (DeepFace)
  POST /detect-voice  — Emotion from audio file (Wav2Vec2 or heuristic fallback)
  GET  /health        — Health check

Dependencies:
  pip install flask flask-cors transformers deepface opencv-python soundfile numpy
"""

from flask import Flask, request, jsonify
from transformers import pipeline
from deepface import DeepFace
import base64
import numpy as np
import cv2
import soundfile as sf
import io
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

PORT = 5001

@app.route("/", methods=["GET"])
def index():
    return f"SentiVibe Emotion Detection API is active on port {PORT}."

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "SentiVibe Emotion Detection",
        "models": {
            "text": True,
            "voice": USE_VOICE_MODEL,
            "face": True
        }
    })

# ── Model loading ──────────────────────────────────────────────────────

# Text emotion model
text_model = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base"
)

# Voice emotion model — wav2vec2 fine-tuned on RAVDESS
print("Loading voice emotion model...")
try:
    voice_model = pipeline(
        "audio-classification",
        model="ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition"
    )
    USE_VOICE_MODEL = True
    print("Voice emotion model loaded successfully.")
except Exception as e:
    USE_VOICE_MODEL = False
    print(f"Voice ML model unavailable ({e}), using heuristic fallback.")


# ── Helpers ────────────────────────────────────────────────────────────

def resample_numpy(audio, orig_sr, target_sr):
    """Linear-interpolation resampler — no librosa/ffmpeg needed."""
    if orig_sr == target_sr:
        return audio
    target_len = int(len(audio) * target_sr / orig_sr)
    return np.interp(
        np.linspace(0, len(audio) - 1, target_len),
        np.arange(len(audio)),
        audio
    ).astype(np.float32)


def heuristic_emotion(audio, sr):
    """Multi-feature fallback — RMS energy + ZCR + spectral centroid."""
    peak = np.max(np.abs(audio))
    if peak < 1e-6:
        return "silence"
    audio = audio / peak   # normalise so mic volume doesn't matter

    rms = float(np.sqrt(np.mean(audio ** 2)))
    zcr = float(np.mean(np.abs(np.diff(np.sign(audio)))) / 2)

    fft_mag = np.abs(np.fft.rfft(audio))
    freqs   = np.fft.rfftfreq(len(audio), d=1.0 / sr)
    total   = np.sum(fft_mag) + 1e-10
    sc      = float(np.sum(freqs * fft_mag) / total)  # spectral centroid Hz

    if   rms > 0.45 and zcr > 0.12:   return "angry"
    elif rms > 0.40 and sc  > 2200:   return "happy"
    elif rms > 0.30 and sc  > 1600:   return "excited"
    elif rms < 0.15 and sc  < 900:    return "sad"
    elif rms < 0.20:                   return "calm"
    else:                              return "neutral"


# ── Routes ─────────────────────────────────────────────────────────────

@app.route("/detect-text", methods=["POST"])
def detect_text():
    try:
        data   = request.json
        text   = data["text"]
        result = text_model(text)[0]
        return jsonify({
            "emotion":    result["label"],
            "confidence": float(result["score"])
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/detect-face", methods=["POST"])
def detect_face():
    try:
        data      = request.json
        img_data  = base64.b64decode(data["image"])
        np_arr    = np.frombuffer(img_data, np.uint8)
        img       = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        result    = DeepFace.analyze(img, actions=["emotion"])
        emotion   = result[0]["dominant_emotion"]
        return jsonify({"emotion": emotion})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/detect-voice", methods=["POST"])
def detect_voice():
    try:
        file        = request.files["audio"]
        audio_bytes = io.BytesIO(file.read())
        audio, sr   = sf.read(audio_bytes)

        if audio.ndim > 1:
            audio = audio.mean(axis=1)        # stereo → mono
        audio = audio.astype(np.float32)

        if USE_VOICE_MODEL:
            audio_16k = resample_numpy(audio, sr, 16000)
            result    = voice_model({"array": audio_16k, "sampling_rate": 16000})
            emotion   = result[0]["label"]
        else:
            emotion = heuristic_emotion(audio, sr)

        return jsonify({"emotion": emotion})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print(f"🎭 SentiVibe Emotion Detection starting on http://localhost:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
