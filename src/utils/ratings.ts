/**
 * Extracts and validates US movie ratings from any text string.
 * Only returns standard MPAA ratings: G, PG, PG-13, R, NC-17
 */
export const extractUSMovieRating = (rating?: string): string | null => {
    if (!rating) return null;
    
    // List of valid US movie ratings to look for with word boundaries
    const ratingPatterns = [
        /\bG\b/,
        /\bPG\b/,
        /\bPG-13\b/,
        /\bR\b/,
        /\bNC-17\b/
    ];
    
    // Try to find any valid rating within the text
    const upperRating = rating.toUpperCase();
    const found = ratingPatterns.find(pattern => pattern.test(upperRating));
    
    // Return the matched rating
    if (found) {
        const match = upperRating.match(found);
        return match ? match[0] : null;
    }
    
    return null;
}; 