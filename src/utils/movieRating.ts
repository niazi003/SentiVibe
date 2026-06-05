/**
 * Movie rating helpers — prefer IMDb (OMDB) over dataset scores for display.
 */

export function parseImdbRating(value: string | null | undefined): number | null {
    if (!value || value === 'N/A') {
        return null;
    }

    const parsed = parseFloat(value.trim());
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) {
        return null;
    }

    return parsed;
}

/** Primary score for badges and star rows (IMDb first, dataset fallback). */
export function getMovieDisplayRating(item: {
    imdbRating?: string | null;
    rating?: number | null;
}): number | null {
    return parseImdbRating(item.imdbRating) ?? (item.rating ?? null);
}

export function getRatingBadgeColor(score: number): string {
    if (score >= 7) {
        return '#10B981';
    }
    if (score >= 5) {
        return '#F59E0B';
    }
    return '#EF4444';
}

export function getStarDisplay(scoreOutOf10: number): { fullStars: number; hasHalf: boolean } {
    const starsOf5 = scoreOutOf10 / 2;
    const fullStars = Math.floor(starsOf5);
    const hasHalf = starsOf5 - fullStars >= 0.4;
    return { fullStars, hasHalf };
}
