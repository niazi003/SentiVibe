"""
emotion_server.py
SentiVibe Emotion Detection Server – runs on port 5001.

Endpoints:
  POST /detect-text   — Emotion from text (DistilRoBERTa)
  POST /detect-face   — Emotion from camera image (DeepFace CNN)
  POST /transcribe    — Pure speech-to-text (Distil-Whisper)
  GET  /recommend-movies — Movies recommender
  GET  /health        — Health check

Dependencies:
  pip install flask flask-cors transformers deepface opencv-python soundfile numpy torch torchaudio
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

app = Flask(__name__)
CORS(app)

PORT = 5001

TEXT_MODEL_ID = "j-hartmann/emotion-english-distilroberta-base"
STT_MODEL_ID  = "distil-whisper/distil-small.en"
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
            "face": "DeepFace (lazy-loaded)",
            "speech_to_text": STT_MODEL_ID if USE_STT_MODEL else None,
        },
        "movies_recommender": MOVIES_READY,
        "ffmpeg_cli": bool(_resolve_ffmpeg_executable()),
        "ffmpeg_exe": _resolve_ffmpeg_executable(),
    })

# ── Model loading ──────────────────────────────────────────────────────

print("Loading text emotion model...")
text_model = pipeline("text-classification", model=TEXT_MODEL_ID)
# DeepFace is imported lazily inside the /detect-face route — no startup cost here.

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


# Load Haar Cascade once at module level — it's a tiny XML file bundled with OpenCV, no extra download.
_FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


def _count_faces(img_bgr: np.ndarray) -> int:
    """
    Two-pass Haar Cascade face counter.

    A single set of parameters cannot reliably serve two opposite goals:
      - Catching multiple small faces in group photos (needs to be LENIENT)
      - Avoiding false positives on single-face selfies (needs to be STRICT)

    Pass 1 — LENIENT (minNeighbors=3, minSize=30): used only for counting.
      - Detects small faces in group photos; may have occasional false positives.
      - If it finds 2+ faces, we can be confident there really are multiple people.

    Pass 2 — STRICT (minNeighbors=8, minSize=90): used only to CONFIRM 1 real face.
      - High threshold, face must be large and well-lit to pass.
      - Eliminates false positives from shadows, patterns, background.

    Decision table:
      lenient >= 2              → multiple faces (reject)
      strict == 1               → single confirmed face (proceed)
      lenient == 1, strict == 0 → probable face at angle/dim light (proceed)
      both == 0                 → no face / animal (reject)
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # Pass 1: lenient — catches small faces in groups
    lenient = _FACE_CASCADE.detectMultiScale(
        gray,
        scaleFactor=1.05,
        minNeighbors=3,
        minSize=(30, 30),
    )
    lenient_count = len(lenient) if isinstance(lenient, np.ndarray) else 0

    # Pass 2: strict — confirms a single real frontal face
    strict = _FACE_CASCADE.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=8,
        minSize=(90, 90),
    )
    strict_count = len(strict) if isinstance(strict, np.ndarray) else 0

    print(
        f"[FaceGuard] {img_bgr.shape[1]}x{img_bgr.shape[0]} "
        f"→ lenient={lenient_count}, strict={strict_count}"
    )

    if strict_count == 1:
        # One confirmed frontal face — proceed regardless of lenient noise.
        return 1

    if strict_count >= 2:
        # Strict found multiple large faces — definitely a group.
        return strict_count

    if lenient_count >= 3:
        # strict found 0 but lenient found 3+ — multiple smaller faces
        # that are too small/angled for strict but real enough for lenient.
        return lenient_count

    # strict found 0 faces and lenient found fewer than 3.
    # Likely an object, pattern, or shadow — not a real human face.
    return 0


@app.route("/detect-face", methods=["POST"])
def detect_face():
    try:
        from deepface import DeepFace

        data     = request.json
        img_data = base64.b64decode(data["image"])
        np_arr   = np.frombuffer(img_data, np.uint8)
        img      = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            return jsonify({"error": "Could not decode image."}), 400

        # ── Face validation guard (Haar Cascade, ~10ms, CPU-only) ──────────
        face_count = _count_faces(img)

        if face_count == 0:
            return jsonify({
                "error": "no_face_detected",
                "message": "No human face detected. Please use a clear, well-lit photo with your face visible.",
            }), 422

        if face_count > 1:
            return jsonify({
                "error": "multiple_faces_detected",
                "message": f"{face_count} faces detected. Please use a photo with only one person.",
            }), 422
        # ── Exactly 1 human face — proceed to CNN emotion analysis ─────────

        # enforce_detection=False: face already confirmed above; this lets DeepFace
        # handle slight angles/lighting without raising its own DetectorError.
        # silent=True suppresses DeepFace console spam.
        analysis = DeepFace.analyze(
            img,
            actions=["emotion"],
            enforce_detection=False,
            silent=True,
        )
        emotions   = analysis[0]["emotion"]          # dict of emotion → % score (numpy.float32)
        dominant   = analysis[0]["dominant_emotion"] # string
        # Explicit float() cast — DeepFace returns numpy.float32 which Flask cannot JSON-serialize.
        confidence = round(float(emotions[dominant]) / 100.0, 4)
        return jsonify({"emotion": dominant.lower(), "confidence": confidence})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/transcribe", methods=["POST"])
def transcribe():
    """
    Pure speech-to-text endpoint using Distil-Whisper.
    No emotion analysis — just returns what the user said as text.

    Input : multipart/form-data with field 'audio' (WAV / M4A / AAC / etc.)
    Output: { "transcript": str }  — or { "error": str } on failure
    """
    try:
        file = request.files.get("audio")
        if not file:
            return jsonify({"error": "audio file required (field name: audio)"}), 400

        if not USE_STT_MODEL or stt_model is None:
            return jsonify({"error": "Speech-to-text model is not loaded on this server."}), 503

        audio, sr = decode_uploaded_audio(file)
        audio_16k = resample_numpy(audio, sr, 16000)

        result = stt_model({"array": audio_16k.astype("float32"), "sampling_rate": 16000})
        if isinstance(result, dict):
            transcript = (result.get("text") or "").strip()
        else:
            transcript = str(result).strip()

        if not transcript:
            return jsonify({"error": "Could not detect any speech. Please speak clearly and try again."}), 400

        return jsonify({"transcript": transcript})

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/recommend-movies", methods=["GET", "POST"])
def recommend_movies_route():
    """Top movie picks for a detected app mood (+ optional chat text & user prefs for ranking)."""
    try:
        if not MOVIES_READY:
            return jsonify({"error": "Movie recommender is not loaded."}), 503

        if request.method == "POST":
            data = request.get_json(silent=True) or {}
            mood = data.get("mood") or data.get("emotion")
            user_text = data.get("text") or data.get("user_text") or ""
            limit = int(data.get("limit", 20))
            movie_genres = data.get("movie_genres") or []
            movie_night_vibe = data.get("movie_night_vibe") or ""
        else:
            mood = request.args.get("mood") or request.args.get("emotion")
            user_text = request.args.get("text", "")
            limit = int(request.args.get("limit", 20))
            # movie_genres may be sent as a JSON-encoded array string or comma-separated
            raw_genres = request.args.get("movie_genres", "")
            if raw_genres:
                try:
                    import json as _json
                    movie_genres = _json.loads(raw_genres)
                except Exception:
                    movie_genres = [g.strip() for g in raw_genres.split(",") if g.strip()]
            else:
                movie_genres = []
            movie_night_vibe = request.args.get("movie_night_vibe", "")

        if not mood:
            return jsonify({"error": "mood is required"}), 400

        from movie_recommender import recommend_movies

        movies = recommend_movies(
            mood,
            user_text=user_text,
            top_k=min(max(limit, 1), 50),
            movie_genres=movie_genres or None,
            movie_night_vibe=movie_night_vibe or None,
        )
        return jsonify({"mood": mood, "movies": movies, "count": len(movies)})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print(f"🎭 SentiVibe Emotion Detection starting on http://localhost:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
