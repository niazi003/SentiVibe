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
"""

import json
import re
import logging

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
OLLAMA_MODEL = "llama3"
PORT         = 8000

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
            "temperature": 0.75,   # some warmth / creativity
            "num_predict": 300,    # keep responses short
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


def extract_json(raw: str) -> dict:
    """
    Try to parse a JSON object from the raw LLM output.
    The LLM sometimes wraps its response in markdown fences — we handle that.

    Returns a dict with "reply" and "detectedEmotion" keys.
    Falls back to safe defaults if parsing fails.
    """
    # Strip markdown code fences if present
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()

    # Find the first { ... } block
    match = re.search(r"\{.*?\}", cleaned, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group())
            reply   = str(data.get("reply", "")).strip()
            emotion = str(data.get("detectedEmotion", "neutral")).strip().lower()
            if emotion not in SUPPORTED_EMOTIONS:
                emotion = "neutral"
            if reply:
                return {"reply": reply, "detectedEmotion": emotion}
        except json.JSONDecodeError:
            pass

    # Fallback: use the raw text as the reply
    log.warning("Could not parse JSON from LLM output. Using raw text fallback.")
    fallback_reply = cleaned[:300] if cleaned else "I'm here with you. How are you feeling right now?"
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
    app.run(host="0.0.0.0", port=PORT, debug=False)
