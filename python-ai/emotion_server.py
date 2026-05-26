"""
emotion_server.py
SentiVibe Emotion Detection Server – runs on port 5001.

Endpoints:
  POST /detect-text   — Emotion from text (DistilRoBERTa)
  POST /detect-face   — Emotion from camera image (ViT, dima806)
  POST /detect-voice  — Emotion from spoken words (Whisper STT → DistilRoBERTa), tone as fallback
  GET  /health        — Health check

Dependencies:
  pip install flask flask-cors transformers pillow opencv-python soundfile numpy torch torchaudio
  For voice from AAC/M4A: install the ffmpeg CLI and ensure it is on PATH (restart the terminal after changing PATH).
"""

import base64
import io
import os
import shutil
import subprocess
import tempfile
import warnings

# Quiet benign Windows / TF / HuggingFace startup noise (server still works normally).
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
warnings.filterwarnings("ignore", message=".*slow processor.*")

from flask import Flask, request, jsonify
from transformers import pipeline

import cv2
import numpy as np
import soundfile as sf
from flask_cors import CORS
from PIL import Image

app = Flask(__name__)
CORS(app)

PORT = 5001

TEXT_MODEL_ID = "j-hartmann/emotion-english-distilroberta-base"
FACE_MODEL_ID = "dima806/facial_emotions_image_detection"
STT_MODEL_ID = "distil-whisper/distil-small.en"
TONE_MODEL_ID = "HaniaRuby/speech-emotion-recognition-wav2vec2"

# Explicit self-reported mood phrases — checked on transcript before the ML text classifier.
SPOKEN_MOOD_PHRASES: list[tuple[list[str], str]] = [
    (["motivated", "motivation", "pumped up", "energized", "determined", "inspired"], "joy"),
    (["not feeling good", "don't feel good", "do not feel good", "feel bad", "feel awful", "feel terrible", "feel horrible", "not well", "unwell"], "sadness"),
    (["i am sad", "i'm sad", "feeling sad", "so sad", "very sad", "depressed", "down today"], "sadness"),
    (["i am happy", "i'm happy", "feeling happy", "so happy", "great mood", "feel great", "feel amazing"], "joy"),
    (["anxious", "worried", "stressed out", "nervous", "overwhelmed", "panicking"], "fear"),
    (["angry", "furious", "mad at", "so mad", "irritated", "frustrated"], "anger"),
    (["lonely", "feel alone", "feeling alone", "miss someone"], "lonely"),
    (["calm", "peaceful", "relaxed", "at ease", "chill"], "calm"),
    (["focused", "concentrating", "in the zone"], "focused"),
    (["romantic", "in love", "missing my partner"], "joy"),
]

@app.route("/", methods=["GET"])
def index():
    return f"SentiVibe Emotion Detection API is active on port {PORT}."

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "SentiVibe Emotion Detection",
        "models": {
            "text": TEXT_MODEL_ID,
            "face": FACE_MODEL_ID if USE_FACE_MODEL else None,
            "speech_to_text": STT_MODEL_ID if USE_STT_MODEL else None,
            "voice_tone_fallback": TONE_MODEL_ID if USE_TONE_MODEL else None,
        },
        "movies_recommender": MOVIES_READY,
        "ffmpeg_cli": bool(_resolve_ffmpeg_executable()),
        "ffmpeg_exe": _resolve_ffmpeg_executable(),
    })

# ── Model loading ──────────────────────────────────────────────────────

print("Loading text emotion model...")
text_model = pipeline("text-classification", model=TEXT_MODEL_ID)

print("Loading face emotion model (ViT)...")
try:
    face_model = pipeline("image-classification", model=FACE_MODEL_ID)
    _face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    USE_FACE_MODEL = True
    print("Face emotion model loaded successfully.")
except Exception as e:
    USE_FACE_MODEL = False
    face_model = None
    _face_cascade = None
    print(f"Face ML model unavailable ({e}).")

print("Loading speech-to-text model (Distil-Whisper)...")
try:
    stt_model = pipeline(
        "automatic-speech-recognition",
        model=STT_MODEL_ID,
        chunk_length_s=30,
        batch_size=1,
    )
    USE_STT_MODEL = True
    print("Speech-to-text model loaded successfully.")
except Exception as e:
    USE_STT_MODEL = False
    stt_model = None
    print(f"Speech-to-text model unavailable ({e}).")

print("Loading voice tone model (secondary fallback)...")
try:
    tone_model = pipeline("audio-classification", model=TONE_MODEL_ID)
    USE_TONE_MODEL = True
    print("Voice tone model loaded successfully.")
except Exception as e:
    USE_TONE_MODEL = False
    tone_model = None
    print(f"Voice tone model unavailable ({e}).")

print("Loading movie recommender (TF-IDF)...")
try:
    from movie_recommender import get_movie_engine

    get_movie_engine()
    MOVIES_READY = True
    print("Movie recommender loaded successfully.")
except Exception as e:
    MOVIES_READY = False
    print(f"Movie recommender unavailable ({e}).")


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


def _resolve_ffmpeg_executable():
    """
    Prefer explicit env (Windows users often have FFmpeg installed but not on PATH):
      FFMPEG_PATH or SENTIVIBE_FFMPEG = full path to ffmpeg.exe
    Then PATH lookup via shutil.which('ffmpeg').
    """
    for key in ("FFMPEG_PATH", "SENTIVIBE_FFMPEG"):
        p = (os.environ.get(key) or "").strip().strip('"')
        if p and os.path.isfile(p):
            return p
    return shutil.which("ffmpeg")


def _decode_via_ffmpeg_cli(raw: bytes, suffix: str) -> tuple[np.ndarray, int]:
    """
    Decode AAC/M4A/MP4 etc. using the ffmpeg executable on PATH, then read PCM WAV with soundfile.
    Avoids torchaudio 2.x + TorchCodec on Windows for mobile container formats.
    """
    ffmpeg = _resolve_ffmpeg_executable()
    if not ffmpeg:
        raise RuntimeError(
            "ffmpeg executable not found. Install FFmpeg, add its bin folder to your user PATH, "
            "restart the terminal, then restart emotion_server.py — or set FFMPEG_PATH to the full "
            "path of ffmpeg.exe (e.g. C:\\\\ffmpeg\\\\bin\\\\ffmpeg.exe). On Windows 11: winget install Gyan.FFmpeg"
        )

    ext = suffix if suffix.startswith(".") else f".{suffix}"
    if ext not in (".wav", ".flac", ".ogg", ".m4a", ".mp4", ".aac", ".mp3", ".caf", ".webm"):
        ext = ".m4a"

    fd_in, path_in = tempfile.mkstemp(suffix=ext)
    fd_out, path_out = tempfile.mkstemp(suffix=".wav")
    os.close(fd_in)
    os.close(fd_out)
    try:
        with open(path_in, "wb") as f:
            f.write(raw)
        proc = subprocess.run(
            [
                ffmpeg,
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                path_in,
                "-ac",
                "1",
                "-ar",
                "16000",
                "-f",
                "wav",
                path_out,
            ],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        if proc.returncode != 0:
            err = (proc.stderr or proc.stdout or "").strip() or f"exit {proc.returncode}"
            raise RuntimeError(err)

        audio, sr = sf.read(path_out, dtype="float32", always_2d=False)
        return np.asarray(audio, dtype=np.float32), int(sr)
    finally:
        for p in (path_in, path_out):
            try:
                os.unlink(p)
            except OSError:
                pass


def decode_uploaded_audio(file_storage):
    """
    Load mono float32 audio + sample rate from an uploaded file.
    soundfile for WAV/FLAC/OGG; ffmpeg CLI for AAC/M4A from mobile; torchaudio last resort.
    """
    raw = file_storage.read()
    if not raw:
        raise ValueError("empty audio upload")

    filename = (getattr(file_storage, "filename", None) or "upload.bin").lower()

    bio = io.BytesIO(raw)
    audio = None
    sr = None
    sf_err = None

    try:
        audio, sr = sf.read(bio, dtype="float32", always_2d=False)
    except Exception as e:
        sf_err = e
        ext = os.path.splitext(filename)[1] or ".m4a"

        # Mobile clips are usually AAC/M4A — use system ffmpeg (PATH), not torchaudio/TorchCodec.
        try:
            audio, sr = _decode_via_ffmpeg_cli(raw, ext)
        except Exception as ff_err:
            ta_err = None
            try:
                import torchaudio

                fd, path = tempfile.mkstemp(suffix=ext if ext.startswith(".") else f".{ext}")
                os.close(fd)
                try:
                    with open(path, "wb") as tmp_f:
                        tmp_f.write(raw)
                    wav_tensor, sr = torchaudio.load(path)
                    audio = wav_tensor.mean(dim=0).detach().cpu().numpy().astype(np.float32)
                finally:
                    try:
                        os.unlink(path)
                    except OSError:
                        pass
            except Exception as e2:
                ta_err = e2

            if audio is None:
                hint = (
                    "Could not decode mobile audio. Install the ffmpeg command-line tool and add its "
                    "folder to PATH, then restart this Python process (PATH is read at startup). "
                    f"soundfile: {sf_err!s}; ffmpeg: {ff_err!s}"
                )
                if ta_err is not None:
                    hint += f"; torchaudio: {ta_err!s}"
                raise ValueError(hint) from ff_err

    audio = np.asarray(audio, dtype=np.float32)
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    if audio.size < 1:
        raise ValueError("decoded audio is empty")
    return audio, int(sr)


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


def _crop_largest_face_bgr(img_bgr: np.ndarray) -> np.ndarray:
    """Detect and crop the largest frontal face; fall back to the full frame."""
    if _face_cascade is None or img_bgr is None or img_bgr.size == 0:
        return img_bgr

    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    faces = _face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.08,
        minNeighbors=4,
        minSize=(64, 64),
    )
    if len(faces) == 0:
        return img_bgr

    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    pad = int(0.18 * max(w, h))
    height, width = img_bgr.shape[:2]
    x1 = max(0, x - pad)
    y1 = max(0, y - pad)
    x2 = min(width, x + w + pad)
    y2 = min(height, y + h + pad)
    return img_bgr[y1:y2, x1:x2]


def _bgr_to_pil_rgb(img_bgr: np.ndarray) -> Image.Image:
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)


def _normalize_model_label(raw_label: str) -> str:
    """Strip HuggingFace label prefixes like LABEL_0 and lower-case."""
    label = (raw_label or "").strip()
    if label.upper().startswith("LABEL_"):
        return label.lower()
    return label.lower()


def _emotion_from_text_content(text: str) -> tuple[str, float]:
    """Classify emotion from written/spoken words."""
    cleaned = (text or "").strip()
    if not cleaned:
        raise ValueError("empty text for emotion classification")
    result = text_model(cleaned)[0]
    return _normalize_model_label(result["label"]), float(result["score"])


def _keyword_emotion_from_transcript(transcript: str) -> tuple[str, float] | None:
    """Match explicit mood phrases people say out loud (e.g. 'I am sad', 'not feeling good')."""
    lower = transcript.lower().strip()
    if not lower:
        return None
    for phrases, label in SPOKEN_MOOD_PHRASES:
        if any(phrase in lower for phrase in phrases):
            return label, 0.92
    return None


def _transcribe_audio(audio_16k: np.ndarray) -> str:
    """Turn speech audio into text — primary signal for voice mood detection."""
    if not USE_STT_MODEL or stt_model is None:
        return ""
    result = stt_model({"array": audio_16k.astype(np.float32), "sampling_rate": 16000})
    if isinstance(result, dict):
        return (result.get("text") or "").strip()
    return str(result).strip()


def _emotion_from_voice_pipeline(audio: np.ndarray, sr: int) -> dict:
    """
    Voice mood detection priority:
      1. What the user said (Whisper transcript + phrase / text classifier)
      2. How they said it (tone model)
      3. Heuristic audio features
    """
    audio_16k = resample_numpy(audio, sr, 16000)
    transcript = _transcribe_audio(audio_16k)

    tone_emotion = None
    tone_confidence = None
    if USE_TONE_MODEL:
        try:
            tone_emotion, tone_confidence = _emotion_from_tone_model(audio_16k)
        except Exception as tone_err:
            print(f"[detect-voice] tone model skipped: {tone_err!r}")

    if transcript:
        keyword_hit = _keyword_emotion_from_transcript(transcript)
        if keyword_hit:
            emotion, confidence = keyword_hit
            return {
                "emotion": emotion,
                "confidence": confidence,
                "transcript": transcript,
                "source": "speech_phrase",
                "tone_emotion": tone_emotion,
            }

        try:
            emotion, confidence = _emotion_from_text_content(transcript)
            if confidence >= 0.20:
                return {
                    "emotion": emotion,
                    "confidence": confidence,
                    "transcript": transcript,
                    "source": "speech_text",
                    "tone_emotion": tone_emotion,
                }
        except Exception as text_err:
            print(f"[detect-voice] text emotion from transcript failed: {text_err!r}")

    if tone_emotion:
        return {
            "emotion": tone_emotion,
            "confidence": tone_confidence,
            "transcript": transcript or None,
            "source": "tone",
        }

    return {
        "emotion": heuristic_emotion(audio, sr),
        "transcript": transcript or None,
        "source": "heuristic",
    }


def _emotion_from_face_model(img_bgr: np.ndarray) -> tuple[str, float]:
    """Run ViT face pipeline on a cropped face region."""
    cropped = _crop_largest_face_bgr(img_bgr)
    pil_img = _bgr_to_pil_rgb(cropped)

    results = face_model(pil_img, top_k=3)
    if not results:
        raise ValueError("face model returned empty result")

    top = results[0]
    label = _normalize_model_label(top.get("label", ""))
    score = float(top.get("score", 0.0))

    # If the top prediction is weak, prefer the highest-scoring non-neutral label.
    if score < 0.35 and len(results) > 1:
        for candidate in results:
            cand_label = _normalize_model_label(candidate.get("label", ""))
            cand_score = float(candidate.get("score", 0.0))
            if cand_label != "neutral" and cand_score >= score * 0.85:
                return cand_label, cand_score

    return label, score


def _emotion_from_tone_model(audio_16k: np.ndarray) -> tuple[str, float]:
    """Secondary: vocal tone / prosody via Wav2Vec2 SER model."""
    min_samples = 16000  # 1 s @ 16 kHz
    if len(audio_16k) < min_samples:
        audio_16k = np.pad(audio_16k.astype(np.float32), (0, min_samples - len(audio_16k)))

    result = tone_model({"array": audio_16k, "sampling_rate": 16000}, top_k=3)
    if not result:
        raise ValueError("voice model returned empty result")

    top = result[0]
    if isinstance(top, dict):
        label = _normalize_model_label(top.get("label") or top.get("class") or str(top))
        score = float(top.get("score", 0.0))
    else:
        label = _normalize_model_label(str(top))
        score = 0.0

    if score < 0.30 and len(result) > 1:
        for candidate in result:
            if not isinstance(candidate, dict):
                continue
            cand_label = _normalize_model_label(candidate.get("label", ""))
            cand_score = float(candidate.get("score", 0.0))
            if cand_label != "neutral" and cand_score >= score * 0.85:
                return cand_label, cand_score

    return label, score


# ── Routes ─────────────────────────────────────────────────────────────

@app.route("/detect-text", methods=["POST"])
def detect_text():
    try:
        data   = request.json
        text   = data["text"]
        result = text_model(text)[0]
        return jsonify({
            "emotion":    _normalize_model_label(result["label"]),
            "confidence": float(result["score"])
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/detect-face", methods=["POST"])
def detect_face():
    try:
        if not USE_FACE_MODEL:
            return jsonify({"error": "Face emotion model is not loaded."}), 503

        data     = request.json
        img_data = base64.b64decode(data["image"])
        np_arr   = np.frombuffer(img_data, np.uint8)
        img      = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            return jsonify({"error": "Could not decode image."}), 400

        emotion, confidence = _emotion_from_face_model(img)
        return jsonify({"emotion": emotion, "confidence": confidence})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/detect-voice", methods=["POST"])
def detect_voice():
    try:
        file = request.files.get("audio")
        if not file:
            return jsonify({"error": "audio file required (field name: audio)"}), 400

        audio, sr = decode_uploaded_audio(file)
        result = _emotion_from_voice_pipeline(audio, sr)

        payload = {"emotion": result["emotion"]}
        if result.get("confidence") is not None:
            payload["confidence"] = result["confidence"]
        if result.get("transcript"):
            payload["transcript"] = result["transcript"]
        if result.get("source"):
            payload["source"] = result["source"]
        return jsonify(payload)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/recommend-movies", methods=["GET", "POST"])
def recommend_movies_route():
    """Top movie picks for a detected app mood (+ optional chat text for ranking)."""
    try:
        if not MOVIES_READY:
            return jsonify({"error": "Movie recommender is not loaded."}), 503

        if request.method == "POST":
            data = request.get_json(silent=True) or {}
            mood = data.get("mood") or data.get("emotion")
            user_text = data.get("text") or data.get("user_text") or ""
            limit = int(data.get("limit", 3))
        else:
            mood = request.args.get("mood") or request.args.get("emotion")
            user_text = request.args.get("text", "")
            limit = int(request.args.get("limit", 3))

        if not mood:
            return jsonify({"error": "mood is required"}), 400

        from movie_recommender import recommend_movies

        movies = recommend_movies(mood, user_text=user_text, top_k=min(max(limit, 1), 10))
        return jsonify({"mood": mood, "movies": movies, "count": len(movies)})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print(f"🎭 SentiVibe Emotion Detection starting on http://localhost:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
