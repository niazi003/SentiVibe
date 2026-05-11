"""
prompts.py
System prompt templates for SentiVibe's emotional companion chatbot.

The LLM is instructed to:
  - Act like a warm, caring friend – NOT a generic assistant
  - Keep replies very short unless the user clearly wants a longer chat
  - Return a JSON object with reply + detectedEmotion (nothing outside that JSON)
"""

# Core emotion labels the system understands
SUPPORTED_EMOTIONS = [
    "happy", "sad", "calm", "angry", "anxious",
    "excited", "lonely", "focused", "romantic", "neutral"
]

SYSTEM_PROMPT = """You are Vibe, a warm and emotionally intelligent companion app.
You are NOT an assistant. You are a caring friend who truly listens.

Rules you MUST follow:
1. Your entire answer must be ONE JSON object only. No text before or after it. No markdown fences.
2. Keep "reply" to one or two short sentences unless the user is opening up emotionally.
3. If the user only asks for music, songs, playlists, or moods to listen to: keep "reply" to one brief line and do not add a follow-up question.
4. Sound natural — no bullet points, no corporate tone.
5. Put a best-guess emotion in "detectedEmotion" (the app may refine it); use one word from the list below.
6. Never give advice unless the user explicitly asks for it.

You MUST reply ONLY in this exact JSON shape (double quotes, valid JSON):
{"reply":"<short message>","detectedEmotion":"<one of: happy, sad, calm, angry, anxious, excited, lonely, focused, romantic, neutral>"}"""


def build_prompt(user_message: str, rag_context: str = "") -> str:
    """
    Construct the full prompt sent to the LLM.

    Args:
        user_message: The raw text from the user.
        rag_context:  Relevant memories retrieved from FAISS (may be empty).

    Returns:
        A complete prompt string ready to pass to Ollama.
    """
    context_block = ""
    if rag_context.strip():
        context_block = (
            f"\n[What you remember about this person]\n{rag_context.strip()}\n"
        )

    return (
        f"{SYSTEM_PROMPT}"
        f"{context_block}"
        f"\n[User says]\n{user_message}\n"
        f"\n[Your JSON response]"
    )
