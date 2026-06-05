import { MediaItem } from '../types';

const normalizeTrackText = (value: string): string =>
    value.toLowerCase().replace(/[^a-z0-9]/g, '');

/** True when Spotify's now-playing metadata matches the playlist track. */
export function isSpotifyTrackMatch(
    spotifyTrackName: string,
    playlistTrack: MediaItem,
): boolean {
    const spotifyName = normalizeTrackText(spotifyTrackName);
    const playlistTitle = normalizeTrackText(playlistTrack.title);

    if (!spotifyName || !playlistTitle) return false;

    return (
        spotifyName === playlistTitle ||
        spotifyName.includes(playlistTitle) ||
        playlistTitle.includes(spotifyName)
    );
}

/** Fisher–Yates shuffle (returns a new array). */
export function shufflePlaylist<T>(items: T[]): T[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/** Tracks from the original playlist that have not been played yet. */
export function getUnplayedTracks(
    originalPlaylist: MediaItem[],
    currentTrack: MediaItem | null,
    history: MediaItem[],
): MediaItem[] {
    const playedIds = new Set<number>([
        ...history.map((track) => track.id),
        ...(currentTrack ? [currentTrack.id] : []),
    ]);

    return originalPlaylist.filter((track) => !playedIds.has(track.id));
}
