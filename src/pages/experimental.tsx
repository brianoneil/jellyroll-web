import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { createApi, getUserLibraries, getAllLibraryItems, getImageUrl } from '@/utils/jellyfin';
import { extractUSMovieRating } from '@/utils/ratings';

interface Movie {
    Id: string;
    Name: string;
    ImageTags?: { 
        Primary?: string;
        Logo?: string;
    };
    BackdropImageTags?: string[];
    Overview?: string;
    Genres?: string[];
    Studios?: { Name: string }[];
    ProductionYear?: number;
    OfficialRating?: string;
    CommunityRating?: number;
    RunTimeTicks?: number;
    People?: { Name: string, Role: string, Type: string }[];
    Tags?: string[];
    PremiereDate?: string;
}

interface MovieCardProps {
    movie: Movie;
    api: any;
    index: number;
    onClick: (id: string) => void;
}

const MovieCard = ({ movie, api, index, onClick }: MovieCardProps) => {
    // Helper function to format runtime
    const formatRuntime = (ticks?: number) => {
        if (!ticks) return null;
        const minutes = Math.floor(ticks / (10000000 * 60));
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return hours > 0 
            ? `${hours}h ${remainingMinutes}m`
            : `${minutes}m`;
    };

    // Helper function to format rating
    const formatRating = (rating?: number) => {
        if (!rating) return null;
        return rating.toFixed(1);
    };

    return (
        <div
            className="movie-card group cursor-pointer animate-fold-in"
            onClick={() => onClick(movie.Id)}
            style={{
                animationDelay: `${index * 100}ms`,
                perspective: '1000px'
            }}
        >
            <div 
                className="relative bg-gray-900 rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:scale-105"
                style={{
                    transformStyle: 'preserve-3d',
                    backfaceVisibility: 'hidden'
                }}
            >
                {/* Poster Image */}
                {api && movie.ImageTags?.Primary && (
                    <div className="aspect-[2/3] relative">
                        <img
                            src={getImageUrl(api, movie.Id, 'Primary')}
                            alt={movie.Name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    </div>
                )}

                {/* Hover Overlay */}
                <div 
                    className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300"
                >
                    {/* Content Rating Badge */}
                    {extractUSMovieRating(movie.OfficialRating) && (
                        <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded text-[11px] font-medium text-white">
                            {extractUSMovieRating(movie.OfficialRating)}
                        </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col">
                        {/* Title or Logo */}
                        {api && movie.ImageTags?.Logo ? (
                            <div className="h-7 mb-2">
                                <img
                                    src={getImageUrl(api, movie.Id, 'Logo' as 'Primary')}
                                    alt={movie.Name}
                                    className="h-full w-auto object-contain filter drop-shadow"
                                />
                            </div>
                        ) : (
                            <h3 className="text-base font-semibold text-white mb-2 line-clamp-1 drop-shadow">
                                {movie.Name}
                            </h3>
                        )}

                        {/* Metadata Row */}
                        <div className="flex items-center gap-1.5 mb-1.5">
                            {movie.CommunityRating && (
                                <div className="flex items-center gap-0.5 bg-yellow-400/10 backdrop-blur-sm px-1.5 py-0.5 rounded text-[13px] font-medium">
                                    <span className="text-yellow-400">★</span>
                                    <span className="text-yellow-200">{formatRating(movie.CommunityRating)}</span>
                                </div>
                            )}
                            {movie.ProductionYear && (
                                <div className="px-1.5 py-0.5 rounded text-[13px] font-medium text-white">
                                    {movie.ProductionYear}
                                </div>
                            )}
                            {formatRuntime(movie.RunTimeTicks) && (
                                <div className="text-[13px] font-medium text-white/90">
                                    {formatRuntime(movie.RunTimeTicks)}
                                </div>
                            )}
                        </div>

                        {/* Genres */}
                        {movie.Genres && movie.Genres.length > 0 && (
                            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                {movie.Genres.slice(0, 3).map((genre) => (
                                    <span 
                                        key={genre} 
                                        className="text-[11px] font-medium px-1.5 py-0.5 bg-white/5 backdrop-blur-sm rounded-sm text-white"
                                    >
                                        {genre}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Overview */}
                        {movie.Overview && (
                            <p className="text-[13px] leading-snug text-white/90 line-clamp-2 font-medium">
                                {movie.Overview}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Add fuzzy search functions
function levenshteinDistance(str1: string, str2: string): number {
    const track = Array(str2.length + 1).fill(null).map(() =>
        Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) track[0][i] = i;
    for (let j = 0; j <= str2.length; j++) track[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1,
                track[j - 1][i] + 1,
                track[j - 1][i - 1] + indicator
            );
        }
    }
    return track[str2.length][str1.length];
}

function fuzzyMatch(text: string, pattern: string, threshold = 0.3): boolean {
    if (!text || !pattern) return false;
    text = text.toLowerCase();
    pattern = pattern.toLowerCase();
    
    // Exact substring match gets highest priority
    if (text.includes(pattern)) return true;
    
    // For very short patterns, require more precise matches
    if (pattern.length <= 2) {
        return text.includes(pattern);
    }
    
    const distance = levenshteinDistance(text, pattern);
    const maxLength = Math.max(text.length, pattern.length);
    const similarity = 1 - distance / maxLength;
    
    return similarity > threshold;
}

export default function Experimental() {
    const router = useRouter();
    const [api, setApi] = useState<any>(null);
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const gridRef = useRef<HTMLDivElement>(null);
    const [columns, setColumns] = useState(4);

    // Enhanced filter function with fuzzy matching
    const filteredMovies = useMemo(() => {
        if (!searchTerm) return movies;
        const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
        
        return movies.filter(movie => {
            // Create an array of searchable text chunks
            const searchableChunks = [
                movie.Name,
                movie.Overview,
                ...(movie.Genres || []),
                ...(movie.Studios?.map(s => s.Name) || []),
                movie.ProductionYear?.toString(),
                movie.OfficialRating,
                ...(movie.Tags || []),
                ...(movie.People?.map(p => `${p.Name} ${p.Role}`) || [])
            ].filter((chunk): chunk is string => typeof chunk === 'string');

            // Match if any word matches any chunk with fuzzy matching
            return searchWords.every(searchWord =>
                searchableChunks.some(chunk => fuzzyMatch(chunk, searchWord))
            );
        });
    }, [movies, searchTerm]);

    // Update columns based on viewport width
    useEffect(() => {
        const updateColumns = () => {
            const width = window.innerWidth;
            if (width < 640) setColumns(1);
            else if (width < 768) setColumns(2);
            else if (width < 1024) setColumns(3);
            else setColumns(4);
        };

        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('jellyfin_token');
        const server = localStorage.getItem('jellyfin_server');
        if (!token || !server) {
            router.push('/login');
            return;
        }
        const jellyfinApi = createApi(server);
        jellyfinApi.accessToken = token;
        setApi(jellyfinApi);
    }, [router]);

    useEffect(() => {
        const fetchMovies = async () => {
            if (!api) return;

            try {
                setLoading(true);
                setError(null);
                const userId = localStorage.getItem('jellyfin_user_id');
                if (!userId) throw new Error('User ID not found');

                const libraries = await getUserLibraries(api, userId);
                const movieLibrary = libraries.find((lib: any) => lib.CollectionType === 'movies');
                if (!movieLibrary) throw new Error('No movie library found');

                const movieItems = await getAllLibraryItems(api, userId, movieLibrary.Id);
                // Randomize the order for more interesting masonry layout
                setMovies(movieItems.sort(() => Math.random() - 0.5));
            } catch (err) {
                console.error('Error fetching movies:', err);
                setError(err instanceof Error ? err.message : 'Failed to load movies');
            } finally {
                setLoading(false);
            }
        };

        fetchMovies();
    }, [api]);

    useEffect(() => {
        const handleScroll = () => {
            if (!gridRef.current) return;
            
            const columns = gridRef.current.children;
            const scrollPosition = window.scrollY;
            
            Array.from(columns).forEach((column, index) => {
                const speed = 0.05 + (index * 0.02);
                const offset = scrollPosition * speed;
                (column as HTMLElement).style.transform = `translateY(${offset}px)`;
            });
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="text-xl text-white">Loading movies...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="text-red-500 bg-red-900/50 p-4 rounded-md">
                    <div className="font-medium">Error</div>
                    <div className="mt-1">{error}</div>
                </div>
            </div>
        );
    }

    // Split filtered movies into columns for masonry layout
    const masonryColumns = Array.from({ length: columns }, (_, i) => 
        filteredMovies.filter((_, index) => index % columns === i)
    );

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="fixed top-0 left-0 right-0 z-10 bg-gradient-to-b from-black via-black/80 to-transparent">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search movies..."
                            className="w-full bg-white/10 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white/20 transition-all duration-300"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <div className="mt-2 text-gray-400 text-sm">
                        {filteredMovies.length} {filteredMovies.length === 1 ? 'movie' : 'movies'} found
                    </div>
                </div>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div ref={gridRef} className="flex gap-4 pt-32" style={{ minHeight: '200vh' }}>
                    {masonryColumns.map((columnMovies, columnIndex) => (
                        <div 
                            key={columnIndex} 
                            className="flex-1 space-y-4 column-transition"
                            style={{ willChange: 'transform' }}
                        >
                            {columnMovies.map((movie, index) => (
                                <MovieCard
                                    key={movie.Id}
                                    movie={movie}
                                    api={api}
                                    index={index}
                                    onClick={(id) => router.push(`/item/${id}`)}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black to-transparent h-32 pointer-events-none" />
        </div>
    );
} 