"""
movie_recommender.py
Emotion-based movie recommendations using TF-IDF + cosine similarity.

Loads cleaned_movies_dataset.csv once at startup, deduplicates by movie + emotion,
and returns top-k titles for an app mood (and optional user text from chat).
Supports personalization via movieGenres + movieNightVibe user preferences.
"""

from __future__ import annotations

import random
import re
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ── Content Safety Filter ─────────────────────────────────────────────────────
# Titles / descriptions containing any of these substrings are excluded.
# Covers sexual / explicit adult content while keeping thrillers / horror intact.
INAPPROPRIATE_KEYWORDS: list[str] = [
    "porn", "pornograph", "erotic", "erotica", "xxx",
    "adult film", "adult movie", "sex tape", "sex scene",
    "nude", "nudist", "nudity",
    "hentai", "softcore", "hardcore",
    "stripper", "escort service", "brothel",
    "sexual explicit", "sexually explicit",
    "orgasm", "masturbat", "fetish",
    "playboy", "penthouse",
]

# ── App mood → CSV emotion labels ─────────────────────────────────────────────
# Covers both app-level mood names (from ResultsScreen/Chatbot) AND raw ML
# model output labels (j-hartmann DistilRoBERTa / DeepFace / heuristic)
APP_MOOD_TO_CSV_EMOTIONS: dict[str, list[str]] = {
    # App mood names
    "happy":    ["happy", "excited", "motivated"],
    "sad":      ["sad"],
    "angry":    ["angry"],
    "anxious":  ["anxious", "sad"],
    "excited":  ["excited", "motivated", "happy"],
    "calm":     ["happy", "motivated"],
    "lonely":   ["sad", "anxious"],
    "focused":  ["motivated", "happy"],
    "romantic": ["happy", "excited"],
    "neutral":  ["happy", "excited"],
    # Raw ML model labels (DistilRoBERTa / DeepFace)
    "joy":      ["happy", "excited", "motivated"],
    "sadness":  ["sad"],
    "anger":    ["angry"],
    "fear":     ["anxious", "sad"],
    "disgust":  ["angry"],
    "surprise": ["excited", "happy"],
    # Heuristic / tone labels
    "excited_tone": ["excited", "motivated"],
    "silence":  ["calm"],
}

_ROOT = Path(__file__).resolve().parent.parent
_CSV_CANDIDATES = [
    _ROOT / "backend" / "data" / "movies" / "cleaned_movies_dataset.csv",
    _ROOT / "cleaned_movies_dataset.csv",
]


def _resolve_csv_path() -> Path:
    for path in _CSV_CANDIDATES:
        if path.is_file():
            return path
    raise FileNotFoundError(
        "Movie dataset not found. Place cleaned_movies_dataset.csv in "
        "backend/data/movies/ or project root."
    )


def _format_genres(raw: str) -> str:
    if not raw or (isinstance(raw, float) and np.isnan(raw)):
        return "Film"
    text = str(raw).strip()
    text = text.replace("[", "").replace("]", "").replace("'", "")
    parts = [p.strip().title() for p in re.split(r"[,|/]", text) if p.strip()]
    return ", ".join(parts[:3]) if parts else "Film"


def _poster_placeholder(title: str) -> str:
    safe = re.sub(r"[^\w\s]", "", title or "Movie")[:40].strip() or "Movie"
    return f"https://placehold.co/300x450/1e293b/e879f9?text={safe.replace(' ', '+')}"


# ── movieNightVibe → genre keywords to boost ─────────────────────────────────
_VIBE_TO_GENRES: dict[str, list[str]] = {
    "comedy":        ["comedy"],
    "action":        ["action", "adventure", "thriller"],
    "drama_romance": ["drama", "romance"],
    "scifi_fantasy": ["sci-fi", "science fiction", "fantasy"],
    "comfort":       ["family", "animation", "comedy", "romance"],
    "no preference": [],
}


def _is_inappropriate(title: str, description: str) -> bool:
    """Return True if the movie title or description contains adult/sexual content."""
    combined = (title + " " + description).lower()
    return any(kw in combined for kw in INAPPROPRIATE_KEYWORDS)


class MovieRecommender:
    def __init__(self, csv_path: Path | None = None):
        path = csv_path or _resolve_csv_path()
        print(f"[movies] Loading dataset from {path}...")
        df = pd.read_csv(path)

        required = {"movie_name", "genres", "Description", "emotion", "Ratings"}
        missing = required - set(df.columns)
        if missing:
            raise ValueError(f"CSV missing columns: {missing}")

        df["emotion_norm"] = df["emotion"].astype(str).str.lower().str.strip()
        if "combined_features" in df.columns:
            df["text_blob"] = df["combined_features"].fillna("").astype(str)
        else:
            df["text_blob"] = (
                df["genres"].astype(str)
                + " "
                + df["Description"].fillna("").astype(str)
                + " "
                + df.get("Reviews", pd.Series([""] * len(df))).fillna("").astype(str)
            )

        # ── Content safety filter — remove inappropriate rows ────────────
        before = len(df)
        mask = [
            not _is_inappropriate(
                str(r["movie_name"]),
                str(r["Description"]) if pd.notna(r.get("Description")) else "",
            )
            for _, r in df.iterrows()
        ]
        df = df[mask].copy()
        print(f"[movies] Content filter: removed {before - len(df)} inappropriate rows.")

        # One row per movie per emotion — keep highest-rated row
        df = df.sort_values("Ratings", ascending=False)
        df = df.drop_duplicates(subset=["movie_name", "emotion_norm"], keep="first")
        df = df.reset_index(drop=True)

        self.df = df
        self.vectorizer = TfidfVectorizer(
            max_features=6000,
            stop_words="english",
            ngram_range=(1, 2),
            min_df=2,
        )
        self.tfidf_matrix = self.vectorizer.fit_transform(df["text_blob"])
        print(f"[movies] Ready: {len(df)} movie–emotion rows, {df['movie_name'].nunique()} unique titles.")

    def recommend(
        self,
        app_mood: str,
        user_text: str = "",
        top_k: int = 20,
        movie_genres: list[str] | None = None,
        movie_night_vibe: str | None = None,
    ) -> list[dict]:
        """
        Return top-k movie picks for the given app mood.

        Parameters
        ----------
        app_mood        : Detected emotion / mood label (e.g. "Happy", "joy", "Sad").
        user_text       : Optional chat context — used for TF-IDF ranking.
        top_k           : Number of results to return.
        movie_genres    : User's preferred genre chips from onboarding (e.g. ["drama", "sci-fi"]).
        movie_night_vibe: User's movie-night vibe from onboarding (e.g. "action", "comfort").
        """
        mood_key = (app_mood or "neutral").strip().lower()

        # ── Personalization: genre filter / boost ────────────────────────
        genre_keywords: list[str] = []
        if movie_genres:
            # Normalize chip labels ("Action & Adventure" → "action", "adventure")
            for g in movie_genres:
                for part in re.split(r"[&/,]", g):
                    kw = part.strip().lower()
                    if kw:
                        genre_keywords.append(kw)
        if movie_night_vibe:
            genre_keywords.extend(_VIBE_TO_GENRES.get(movie_night_vibe, []))

        if mood_key == "neutral":
            # Neutral: user movie prefs only, else highest-rated popular titles (no mood filter)
            pool = self.df.copy()
            pool = pool.sort_values("Ratings", ascending=False)
            pool = pool.drop_duplicates(subset=["movie_name"], keep="first")
            if genre_keywords:
                genres_col = pool["genres"].astype(str).str.lower()
                pref_mask = genres_col.apply(
                    lambda g: any(kw in g for kw in genre_keywords)
                )
                pref_pool = pool[pref_mask]
                if len(pref_pool) >= max(top_k, 3):
                    pool = pref_pool
                elif not pref_pool.empty:
                    extras = pool[~pool.index.isin(pref_pool.index)]
                    pool = pd.concat([pref_pool, extras])
            print(f"[movies] Neutral mood — preference pool={len(pool)} title(s)")
        else:
            allowed = APP_MOOD_TO_CSV_EMOTIONS.get(mood_key, [mood_key])

            pool = self.df[self.df["emotion_norm"].isin(allowed)].copy()
            # Fallback: if no rows match the mood, use the full dataset
            if pool.empty:
                print(f"[movies] No rows for mood='{mood_key}', using full dataset.")
                pool = self.df.copy()

            # One entry per movie title within the mood pool
            pool = pool.sort_values("Ratings", ascending=False)
            pool = pool.drop_duplicates(subset=["movie_name"], keep="first")

            if genre_keywords:
                genres_col = pool["genres"].astype(str).str.lower()
                pref_mask = genres_col.apply(
                    lambda g: any(kw in g for kw in genre_keywords)
                )
                pref_pool = pool[pref_mask]
                # If personalised pool has enough movies use it, else fall back to full mood pool
                if len(pref_pool) >= max(top_k, 3):
                    pool = pref_pool
                elif not pref_pool.empty:
                    # Merge: preferred movies first, then pad from mood pool
                    extras = pool[~pool.index.isin(pref_pool.index)]
                    pool = pd.concat([pref_pool, extras])

        indices = pool.index.to_numpy()
        if len(indices) == 0:
            return []

        # ── Weighted random sampling from the FULL pool ───────────────────
        # Using sqrt(rating) as base weight softens the skew so that a 6-rated
        # film still has 77 % of the probability of a 10-rated one, rather than
        # being buried at the bottom.  Each call therefore produces a genuinely
        # different set of movies while still favouring quality.
        query = (user_text or "").strip()
        ratings = pool["Ratings"].to_numpy().clip(0.1).astype(float)
        rating_weights = np.sqrt(ratings)

        if len(query) >= 3:
            # Blend TF-IDF similarity score with rating weight
            query_vec = self.vectorizer.transform([query])
            subset = self.tfidf_matrix[indices]
            sims = cosine_similarity(query_vec, subset).flatten().clip(0)
            # Softmax over (sim * 0.6 + rating_norm * 0.4) to get probabilities
            combined = sims * 0.6 + (ratings / ratings.max()) * 0.4
            exp_scores = np.exp(combined - combined.max())   # numerically stable
            sample_weights = (exp_scores * rating_weights)   # blend quality in
        else:
            sample_weights = rating_weights

        # Normalise to probabilities
        total = sample_weights.sum()
        if total <= 0:
            sample_weights = np.ones(len(pool))
        probs = sample_weights / sample_weights.sum()

        n = min(top_k, len(pool))
        chosen_positions = np.random.choice(len(pool), size=n, replace=False, p=probs)
        picked = pool.iloc[chosen_positions]

        results = []
        for i, (_, row) in enumerate(picked.iterrows(), start=1):
            title = str(row["movie_name"])
            results.append(
                {
                    "id": i,
                    "title": title,
                    "genres": _format_genres(row["genres"]),
                    "description": str(row["Description"])[:500],
                    "rating": float(row["Ratings"]),
                    "emotion": str(row["emotion_norm"]),
                    "cover": _poster_placeholder(title),
                    "duration": "Feature",
                    "reviews": str(row.get("Reviews", "")),
                }
            )
        return results


_engine: MovieRecommender | None = None


def get_movie_engine() -> MovieRecommender:
    global _engine
    if _engine is None:
        _engine = MovieRecommender()
    return _engine


def recommend_movies(
    app_mood: str,
    user_text: str = "",
    top_k: int = 20,
    movie_genres: list[str] | None = None,
    movie_night_vibe: str | None = None,
) -> list[dict]:
    return get_movie_engine().recommend(
        app_mood,
        user_text=user_text,
        top_k=top_k,
        movie_genres=movie_genres,
        movie_night_vibe=movie_night_vibe,
    )
