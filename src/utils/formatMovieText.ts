/**
 * Normalize movie synopsis and review text from the dataset / OMDB.
 * Fixes lowercase sentences, missing spaces after punctuation, and extra whitespace.
 */

const INVALID_TEXT = new Set(['', 'nan', 'null', 'undefined', 'none']);

function isValidText(text: string | undefined | null): text is string {
    if (!text || typeof text !== 'string') {
        return false;
    }
    return !INVALID_TEXT.has(text.trim().toLowerCase());
}

function normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

function fixQuotes(text: string): string {
    return text.replace(/"{2,}/g, '"');
}

function fixPunctuationSpacing(text: string): string {
    return text
        .replace(/([,;:])([^\s\d])/g, '$1 $2')
        .replace(/([.!?])([^\s\d"'(])/g, '$1 $2')
        .replace(/([.!?])"/g, '$1 "')
        .replace(/\s+([,.!?;:])/g, '$1')
        .replace(/\.{4,}/g, '...')
        .replace(/\.{3}\s*\./g, '...');
}

function capitalizeFirstPerson(text: string): string {
    return text.replace(/\bi\b/g, 'I');
}

function capitalizeSentences(text: string): string {
    if (!text) {
        return '';
    }

    const chars = text.split('');
    let capitalizeNext = true;

    for (let i = 0; i < chars.length; i += 1) {
        const char = chars[i];

        if (capitalizeNext && /[a-z]/.test(char)) {
            chars[i] = char.toUpperCase();
            capitalizeNext = false;
            continue;
        }

        if (/[.!?]/.test(char)) {
            capitalizeNext = true;
            continue;
        }

        if (/[a-zA-Z0-9]/.test(char)) {
            capitalizeNext = false;
        }
    }

    return chars.join('');
}

function truncateAtSentence(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
        return text;
    }

    const slice = text.slice(0, maxLength);
    const lastSentenceEnd = Math.max(
        slice.lastIndexOf('. '),
        slice.lastIndexOf('! '),
        slice.lastIndexOf('? '),
    );

    if (lastSentenceEnd > maxLength * 0.45) {
        return slice.slice(0, lastSentenceEnd + 1).trim();
    }

    const lastSpace = slice.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.6) {
        return `${slice.slice(0, lastSpace).trim()}...`;
    }

    return `${slice.trim()}...`;
}

function extractFirstSentences(text: string, maxSentences: number): string {
    const matches = text.match(/[^.!?]+[.!?]+(?:\s|$)/g);
    if (!matches || matches.length <= maxSentences) {
        return text;
    }
    return matches.slice(0, maxSentences).join(' ').trim();
}

function formatCore(text: string): string {
    let formatted = normalizeWhitespace(fixQuotes(text));
    formatted = fixPunctuationSpacing(formatted);
    formatted = capitalizeFirstPerson(formatted);
    formatted = capitalizeSentences(formatted);
    return formatted;
}

/** Format a movie synopsis / plot for display. */
export function formatMovieSynopsis(text: string | undefined | null): string {
    if (!isValidText(text)) {
        return '';
    }
    return formatCore(text);
}

/** Format a user review snippet for the Top Review section. */
export function formatMovieReview(
    text: string | undefined | null,
    options?: { maxSentences?: number; maxLength?: number },
): string {
    if (!isValidText(text)) {
        return '';
    }

    const maxSentences = options?.maxSentences ?? 3;
    const maxLength = options?.maxLength ?? 480;

    let formatted = formatCore(text);
    formatted = extractFirstSentences(formatted, maxSentences);
    formatted = truncateAtSentence(formatted, maxLength);
    return formatted;
}
