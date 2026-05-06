"""
rag.py
Retrieval-Augmented Generation (RAG) system using FAISS + SentenceTransformers.

Per-user in-memory FAISS index:
  - Stores text memories (past moods, interaction snippets, preferences)
  - Retrieves the top-k most relevant memories for each new user message

Design choices:
  - IndexFlatL2  : exact search (fine for small per-user stores, < 10k docs)
  - all-MiniLM-L6-v2 : fast, accurate 384-dim embeddings
  - Memories are stored as plain strings; the index maps position → text
"""

import numpy as np

from sentence_transformers import SentenceTransformer

# Lazy faiss import so Flask starts even if faiss isn't installed yet
try:
    import faiss
    _FAISS_AVAILABLE = True
except ImportError:
    _FAISS_AVAILABLE = False
    print("[RAG] WARNING: faiss-cpu not installed. RAG will be disabled.")

# ── Model (loaded once, shared across all users) ──────────────
_MODEL_NAME = "all-MiniLM-L6-v2"
_model: SentenceTransformer | None = None

def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        print(f"[RAG] Loading embedding model '{_MODEL_NAME}'...")
        _model = SentenceTransformer(_MODEL_NAME)
        print("[RAG] Model loaded.")
    return _model


# ── Per-user in-memory store ──────────────────────────────────
#
# Structure:  { userId: { "index": faiss.Index, "memories": [str] } }
_user_stores: dict[str, dict] = {}


def _get_store(user_id: str) -> dict:
    """Return (or create) a FAISS index + memory list for a user."""
    if user_id not in _user_stores:
        if _FAISS_AVAILABLE:
            dim   = _get_model().get_sentence_embedding_dimension()
            index = faiss.IndexFlatL2(dim)
        else:
            index = None
        _user_stores[user_id] = {"index": index, "memories": []}
    return _user_stores[user_id]


# ── Public API ────────────────────────────────────────────────

def add_memory(user_id: str, text: str) -> None:
    """
    Embed a text snippet and add it to the user's FAISS index.

    Args:
        user_id: The user identifier.
        text:    A plain-text snippet to remember (mood entry, interaction summary, etc.)
    """
    if not text.strip():
        return

    store = _get_store(user_id)
    store["memories"].append(text)

    if _FAISS_AVAILABLE and store["index"] is not None:
        embedding = _get_model().encode([text], convert_to_numpy=True).astype("float32")
        store["index"].add(embedding)


def retrieve_context(user_id: str, query: str, k: int = 3) -> str:
    """
    Retrieve the k most relevant memories for a query and return them
    as a single concatenated string (ready for prompt injection).

    Args:
        user_id: The user identifier.
        query:   The current user message used as the search query.
        k:       Number of memories to retrieve.

    Returns:
        A newline-separated string of relevant memory snippets,
        or an empty string if no memories exist.
    """
    store = _get_store(user_id)
    memories = store["memories"]

    if not memories:
        return ""

    if not _FAISS_AVAILABLE or store["index"] is None:
        # Fallback: return the last k memories in order
        return "\n".join(memories[-k:])

    k = min(k, len(memories))
    query_vec = _get_model().encode([query], convert_to_numpy=True).astype("float32")
    _, indices = store["index"].search(query_vec, k)

    retrieved = [memories[i] for i in indices[0] if i < len(memories)]
    return "\n".join(retrieved)


def get_memory_count(user_id: str) -> int:
    """Return how many memories are stored for a user."""
    return len(_get_store(user_id)["memories"])
