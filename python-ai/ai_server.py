"""
ai_server.py
SentiVibe Python AI Microservice  –  Flask edition.

POST /chat
  Input : { "userId": str, "message": str }
  Output: { "reply": str, "detectedEmotion": str }

Flow:
  1. Retrieve RAG context (relevant user memories from FAISS)
  2. Build full prompt (system + context + user message)
  3. Call Ollama /api/generate (llama3, streaming=False)
  4. Parse JSON from LLM output
  5. Store new interaction in RAG
  6. Return clean JSON to caller

Run:
  python ai_server.py
    Also starts emotion_server.py on :5001 unless one is already running or
    SKIP_EMOTION_SERVER=1 is set (for running emotion_server.py manually).
"""

import atexit
import json
import logging
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional

import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

from rag import add_memory, retrieve_context
from prompts import build_prompt, SUPPORTED_EMOTIONS

# ── Logging ───────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("SentiVibe-AI")

# ── Flask app ─────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

# ── Config ────────────────────────────────────────────────────
OLLAMA_URL   = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2:1b"
PORT         = 8000
EMOTION_PORT = 5001

_emotion_child: Optional[subprocess.Popen] = None


def _emotion_service_up() -> bool:
    try:
        r = requests.get(f"http://127.0.0.1:{EMOTION_PORT}/health", timeout=0.8)
        return r.status_code == 200
    except Exception:
        return False


def _shutdown_emotion_child() -> None:
    global _emotion_child
    if _emotion_child is None or _emotion_child.poll() is not None:
        _emotion_child = None
        return
    log.info("Stopping emotion_server subprocess…")
    _emotion_child.terminate()
    try:
        _emotion_child.wait(timeout=20)
    except subprocess.TimeoutExpired:
        _emotion_child.kill()
    _emotion_child = None


atexit.register(_shutdown_emotion_child)


def _start_emotion_subprocess() -> Optional[subprocess.Popen]:
    """
    Run emotion_server.py in a child process so text/face/voice endpoints stay
    available without a second manual terminal (unless port 5001 is already in use).
    """
    global _emotion_child
    if os.environ.get("SKIP_EMOTION_SERVER", "").strip().lower() in ("1", "true", "yes"):
        log.info("SKIP_EMOTION_SERVER is set — not starting emotion_server.py")
        return None
    if _emotion_service_up():
        log.info(f"Emotion API already responding on :{EMOTION_PORT} — not spawning a child.")
        return None

    root = Path(__file__).resolve().parent
    script = root / "emotion_server.py"
    if not script.is_file():
        log.warning("emotion_server.py not found — start it manually for face/voice/text models.")
        return None

    log.info(f"Starting emotion_server.py on :{EMOTION_PORT} (models may take a minute to load)…")
    try:
        proc = subprocess.Popen(
            [sys.executable, str(script)],
            cwd=str(root),
        )
    except OSError as e:
        log.warning("Could not start emotion_server: %s", e)
        return None

    _emotion_child = proc

    for _ in range(10):
        time.sleep(1)
        if _emotion_service_up():
            log.info("Emotion service is ready.")
            return proc
        if proc.poll() is not None:
            log.warning("emotion_server.py exited early (code %s).", proc.returncode)
            _emotion_child = None
            return None

    log.info("Emotion service still loading in background; /health on :5001 will turn green when ready.")
    return proc


# ── Helpers ───────────────────────────────────────────────────

def call_ollama(prompt: str) -> str:
    """
    Send a prompt to the local Ollama instance and return the raw text response.
    Raises RuntimeError if Ollama is unreachable or returns a bad status.
    """
    payload = {
        "model":  OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            # Lower temperature improves JSON adherence on small models (e.g. llama3.2:1b).
            "temperature": 0.45,
            "num_predict": 220,
        },
    }
    try:
        resp = requests.post(OLLAMA_URL, json=payload, timeout=60)
        resp.raise_for_status()
        return resp.json().get("response", "")
    except requests.exceptions.ConnectionError:
        raise RuntimeError(
            "Ollama is not running. Start it with: ollama serve"
        )
    except requests.exceptions.Timeout:
        raise RuntimeError("Ollama timed out. Try a smaller model or check resources.")
    except requests.exceptions.HTTPError as e:
        # Surface the actual error from Ollama (e.g. model not found, OOM)
        detail = ""
        try:
            detail = e.response.text[:200]
        except Exception:
            pass
        raise RuntimeError(
            f"Ollama returned {e.response.status_code}: {detail or str(e)}"
        )


# Labels from j-hartmann/emotion-english-distilroberta-base → SentiVibe vocabulary
_HF_EMOTION_TO_VIBE = {
    "joy": "happy",
    "love": "romantic",
    "sadness": "sad",
    "anger": "angry",
    "disgust": "angry",
    "fear": "anxious",
    "surprise": "excited",
    "neutral": "neutral",
}


def detect_emotion_vibe_from_user_text(text: str) -> Optional[str]:
    """
    Classify the user's message with the local emotion microservice (port 5001).
    Returns a SUPPORTED_EMOTIONS value, or None if the service is unavailable.
    """
    if not text.strip():
        return None
    try:
        resp = requests.post(
            f"http://127.0.0.1:{EMOTION_PORT}/detect-text",
            json={"text": text},
            timeout=20,
        )
        if resp.status_code != 200:
            return None
        label = str(resp.json().get("emotion", "")).strip().lower()
        mapped = _HF_EMOTION_TO_VIBE.get(label, label)
        if mapped in SUPPORTED_EMOTIONS:
            return mapped
        return "neutral"
    except Exception:
        return None


def _balanced_json_object(text: str) -> Optional[str]:
    """
    Extract a {...} slice starting at the first '{' using brace depth, respecting
    double-quoted strings so '}' inside a reply does not truncate the object.
    """
    start = text.find("{")
    if start < 0:
        return None
    depth = 0
    i = start
    n = len(text)
    in_string = False
    escape = False
    while i < n:
        ch = text[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
        else:
            if ch == '"':
                in_string = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return text[start : i + 1]
        i += 1
    return None


def _normalize_chat_payload(data: dict) -> Optional[dict]:
    reply = str(data.get("reply", "")).strip()
    emotion = str(data.get("detectedEmotion", "neutral")).strip().lower()
    if emotion not in SUPPORTED_EMOTIONS:
        emotion = "neutral"
    if not reply:
        return None
    return {"reply": reply, "detectedEmotion": emotion}


def _salvage_reply_field(s: str) -> Optional[str]:
    """Recover reply text when JSON is broken but the model started a proper string."""
    m = re.search(r'"reply"\s*:\s*"((?:[^"\\]|\\.)*)"', s, re.DOTALL)
    if m:
        try:
            return str(json.loads(f'"{m.group(1)}"'))
        except json.JSONDecodeError:
            return m.group(1).replace("\\n", "\n").replace('\\"', '"')
    m2 = re.search(r'"reply"\s*:\s*"((?:[^"\\]|\\.)*)', s, re.DOTALL)
    if m2:
        frag = m2.group(1)
        return frag.replace("\\n", "\n").replace('\\"', '"').strip()[:500]
    return None


def extract_json(raw: str) -> dict:
    """
    Parse {"reply": "...", "detectedEmotion": "..."} from LLM output.
    Uses brace-balanced extraction so multi-line JSON and '}' inside strings work.
    """
    cleaned = re.sub(r"```(?:json)?\s*", "", raw, flags=re.I).strip()
    cleaned = re.sub(r"\s*```\s*$", "", cleaned).strip()

    candidates: list[str] = []
    bal = _balanced_json_object(cleaned)
    if bal:
        candidates.append(bal)

    idx = cleaned.find("{")
    if idx >= 0:
        dec = json.JSONDecoder()
        try:
            obj, _ = dec.raw_decode(cleaned[idx:])
            if isinstance(obj, dict):
                norm = _normalize_chat_payload(obj)
                if norm:
                    return norm
        except json.JSONDecodeError:
            pass

    for blob in candidates:
        try:
            data = json.loads(blob)
            if isinstance(data, dict):
                norm = _normalize_chat_payload(data)
                if norm:
                    return norm
        except json.JSONDecodeError:
            continue

    log.warning("Could not parse JSON from LLM output. Using salvage / short fallback.")
    salvaged = _salvage_reply_field(cleaned)
    fallback_reply = salvaged or (cleaned[:280].strip() if cleaned else "I'm here with you. What's on your mind?")
    return {"reply": fallback_reply, "detectedEmotion": "neutral"}


# ── Routes ────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "SentiVibe AI", "model": OLLAMA_MODEL})


@app.route("/chat", methods=["POST"])
def chat():
    """
    Main AI chat endpoint.
    Body: { "userId": str, "message": str }
    """
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "Request body must be JSON."}), 400

    user_id = body.get("userId", "").strip()
    message = body.get("message", "").strip()

    if not user_id or not message:
        return jsonify({"error": "userId and message are required."}), 400

    log.info(f"[{user_id}] ← {message[:80]}")

    # 1. Retrieve relevant memories from FAISS
    rag_context = retrieve_context(user_id, message, k=3)
    if rag_context:
        log.debug(f"[{user_id}] RAG context: {rag_context[:120]}")

    # 2. Build full prompt
    prompt = build_prompt(message, rag_context)

    # 3. Call LLM
    try:
        raw_output = call_ollama(prompt)
    except RuntimeError as e:
        log.error(str(e))
        return jsonify({"error": str(e)}), 503

    # 4. Parse LLM response
    result = extract_json(raw_output)

    # Text emotion from DistilRoBERTa (port 5001) is more reliable than small-LLM JSON.
    ml_emotion = detect_emotion_vibe_from_user_text(message)
    if ml_emotion is not None:
        result["detectedEmotion"] = ml_emotion

    log.info(f"[{user_id}] → emotion={result['detectedEmotion']} | {result['reply'][:60]}")

    # 5. Update RAG with this interaction
    memory_text = (
        f"User said: {message} | "
        f"Emotion detected: {result['detectedEmotion']} | "
        f"Companion replied: {result['reply']}"
    )
    add_memory(user_id, memory_text)

    # Also store a mood memory for personalisation
    add_memory(user_id, f"Mood entry: {result['detectedEmotion']}")

    return jsonify(result)


# ── Entry point ───────────────────────────────────────────────

if __name__ == "__main__":
    log.info(f"🤖 SentiVibe AI service starting on http://localhost:{PORT}")
    log.info(f"   Model : {OLLAMA_MODEL}")
    log.info("   Make sure Ollama is running: ollama serve")
    _start_emotion_subprocess()
    try:
        app.run(host="0.0.0.0", port=PORT, debug=False)
    finally:
        _shutdown_emotion_child()
