"""
movie_recommender.py
Emotion-based movie recommendations using TF-IDF + cosine similarity.

Loads cleaned_movies_dataset.csv once at startup, deduplicates by movie + emotion,
and returns top-k titles for an app mood (and optional user text from chat).
"""

from __future__ import annotations

import re
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# App mood (ResultsScreen / Chatbot) → dataset emotion labels
APP_MOOD_TO_CSV_EMOTIONS: dict[str, list[str]] = {
    "happy": ["happy", "excited", "motivated"],
    "sad": ["sad"],
    "angry": ["angry"],
    "anxious": ["anxious"],
    "excited": ["excited", "motivated", "happy"],
    "calm": ["happy"],
    "lonely": ["sad", "anxious"],
    "focused": ["motivated"],
    "romantic": ["happy", "excited"],
    "neutral": ["happy", "excited", "sad"],
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

        # One row per movie per emotion — keep highest-rated review row
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

    def recommend(self, app_mood: str, user_text: str = "", top_k: int = 3) -> list[dict]:
        mood_key = (app_mood or "neutral").strip().lower()
        allowed = APP_MOOD_TO_CSV_EMOTIONS.get(mood_key, [mood_key])

        pool = self.df[self.df["emotion_norm"].isin(allowed)]
        if pool.empty:
            pool = self.df

        # One entry per movie title within the mood pool
        pool = pool.sort_values("Ratings", ascending=False)
        pool = pool.drop_duplicates(subset=["movie_name"], keep="first")
        indices = pool.index.to_numpy()

        if len(indices) == 0:
            return []

        query = (user_text or "").strip()
        if len(query) >= 3:
            query_vec = self.vectorizer.transform([query])
            subset = self.tfidf_matrix[indices]
            sims = cosine_similarity(query_vec, subset).flatten()
            rating_boost = pool["Ratings"].to_numpy() / 10.0
            scores = sims * 0.75 + rating_boost * 0.25
            order = np.argsort(scores)[::-1][:top_k]
            picked = pool.iloc[order]
        else:
            picked = pool.head(top_k)

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
                }
            )
        return results


_engine: MovieRecommender | None = None


def get_movie_engine() -> MovieRecommender:
    global _engine
    if _engine is None:
        _engine = MovieRecommender()
    return _engine


def recommend_movies(app_mood: str, user_text: str = "", top_k: int = 3) -> list[dict]:
    return get_movie_engine().recommend(app_mood, user_text=user_text, top_k=top_k)
