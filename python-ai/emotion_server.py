"""
emotion_server.py
SentiVibe Emotion Detection Server – runs on port 5001.

Endpoints:
  POST /detect-text   — Emotion from text (DistilRoBERTa)
  POST /detect-face   — Emotion from camera image (DeepFace)
  POST /detect-voice  — Emotion from audio file (Wav2Vec2 or heuristic fallback)
  GET  /health        — Health check

Dependencies:
  pip install flask flask-cors transformers deepface opencv-python soundfile numpy torch torchaudio
  For voice from AAC/M4A: install the ffmpeg CLI and ensure it is on PATH (restart the terminal after changing PATH).
"""

from flask import Flask, request, jsonify
from transformers import pipeline
from deepface import DeepFace
import base64
import io
import os
import shutil
import subprocess
import tempfile

import cv2
import numpy as np
import soundfile as sf
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
        },
        "ffmpeg_cli": bool(_resolve_ffmpeg_executable()),
        "ffmpeg_exe": _resolve_ffmpeg_executable(),
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


def _emotion_from_voice_model(audio_16k: np.ndarray):
    """Run Wav2Vec2 pipeline; raises on failure (caller may fall back to heuristic)."""
    # Very short clips often crash or misbehave in audio-classification pipelines.
    min_samples = 8000  # 0.5 s @ 16 kHz
    if len(audio_16k) < min_samples:
        audio_16k = np.pad(audio_16k.astype(np.float32), (0, min_samples - len(audio_16k)))

    result = voice_model({"array": audio_16k, "sampling_rate": 16000})
    if not result:
        raise ValueError("voice model returned empty result")
    row = result[0]
    if isinstance(row, dict):
        return row.get("label") or row.get("class") or str(row)
    return str(row)


@app.route("/detect-voice", methods=["POST"])
def detect_voice():
    try:
        file = request.files.get("audio")
        if not file:
            return jsonify({"error": "audio file required (field name: audio)"}), 400

        audio, sr = decode_uploaded_audio(file)

        emotion = None
        if USE_VOICE_MODEL:
            try:
                audio_16k = resample_numpy(audio, sr, 16000)
                emotion = _emotion_from_voice_model(audio_16k)
            except Exception as ml_err:
                # Common: torch/transformers version mismatch, ffmpeg missing for decode path, or bad clip.
                print(f"[detect-voice] Wav2Vec2 pipeline failed, using heuristic: {ml_err!r}")
                emotion = heuristic_emotion(audio, sr)
        else:
            emotion = heuristic_emotion(audio, sr)

        return jsonify({"emotion": emotion})
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print(f"🎭 SentiVibe Emotion Detection starting on http://localhost:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
