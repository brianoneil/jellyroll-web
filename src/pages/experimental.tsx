import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { createApi, getUserLibraries, getAllLibraryItems, getImageUrl } from '@/utils/jellyfin';

interface Movie {
    Id: string;
    Name: string;
    ImageTags?: { [key: string]: string };
    BackdropImageTags?: string[];
    Overview?: string;
    Genres?: string[];
    Studios?: { Name: string }[];
    ProductionYear?: number;
    OfficialRating?: string;
    CommunityRating?: number;
    People?: { Name: string, Role: string, Type: string }[];
    Tags?: string[];
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

    // Enhanced filter function
    const filteredMovies = useMemo(() => {
        if (!searchTerm) return movies;
        const searchLower = searchTerm.toLowerCase();
        
        return movies.filter(movie => {
            // Create a searchable text from all relevant fields
            const searchableText = [
                movie.Name,
                movie.Overview,
                movie.Genres?.join(' '),
                movie.Studios?.map(s => s.Name).join(' '),
                movie.ProductionYear?.toString(),
                movie.OfficialRating,
                movie.Tags?.join(' '),
                movie.People?.map(p => `${p.Name} ${p.Role}`).join(' ')
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            // Split search term into words for more flexible matching
            const searchWords = searchLower.split(/\s+/);
            
            // Match if all search words are found in the searchable text
            return searchWords.every(word => searchableText.includes(word));
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
                                <div
                                    key={movie.Id}
                                    className="movie-card group cursor-pointer animate-fold-in"
                                    onClick={() => router.push(`/item/${movie.Id}`)}
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
                                        {api && movie.ImageTags?.Primary && (
                                            <div className="aspect-[2/3]">
                                                <img
                                                    src={getImageUrl(api, movie.Id)}
                                                    alt={movie.Name}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            </div>
                                        )}
                                        <div 
                                            className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300"
                                        >
                                            <div className="absolute bottom-0 left-0 right-0 p-4">
                                                <h3 className="text-lg font-bold text-white mb-2">
                                                    {movie.Name}
                                                </h3>
                                                {movie.Overview && (
                                                    <p className="text-sm text-gray-200 line-clamp-2">
                                                        {movie.Overview}
                                                    </p>
                                                )}
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {movie.Genres?.slice(0, 2).map((genre) => (
                                                        <span 
                                                            key={genre} 
                                                            className="text-xs px-2 py-1 bg-white/10 rounded-full"
                                                        >
                                                            {genre}
                                                        </span>
                                                    ))}
                                                    {movie.ProductionYear && (
                                                        <span className="text-xs px-2 py-1 bg-white/10 rounded-full">
                                                            {movie.ProductionYear}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black to-transparent h-32 pointer-events-none" />
        </div>
    );
} 