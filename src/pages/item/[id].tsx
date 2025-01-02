import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createApi, getItemDetails, getSeasons, getEpisodes, getImageUrl, getStreamUrl, formatRuntime, JellyfinError } from '@/utils/jellyfin';

interface Person {
    Name: string;
    Role: string;
    Type: string;
}

interface Season {
    Id: string;
    Name: string;
    IndexNumber: number;
    ImageTags?: { [key: string]: string };
}

interface Episode {
    Id: string;
    Name: string;
    IndexNumber: number;
    Overview?: string;
    RunTimeTicks?: number;
    ImageTags?: { [key: string]: string };
}

export default function ItemDetail() {
    const router = useRouter();
    const { id } = router.query;
    const [api, setApi] = useState<any>(null);
    const [item, setItem] = useState<any>(null);
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [episodes, setEpisodes] = useState<{ [key: string]: Episode[] }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
        const fetchItemDetails = async () => {
            if (!api || !id) return;

            try {
                setLoading(true);
                setError(null);
                const userId = localStorage.getItem('jellyfin_user_id');
                if (!userId) {
                    throw new JellyfinError('User ID not found');
                }

                const itemData = await getItemDetails(api, id as string, userId);
                setItem(itemData);

                if (itemData.Type === 'Series') {
                    const seasonData = await getSeasons(api, id as string, userId);
                    setSeasons(seasonData);
                    
                    // Fetch episodes for all seasons
                    const episodePromises = seasonData.map((season: Season) => 
                        getEpisodes(api, season.Id, userId)
                    );
                    
                    const allEpisodes = await Promise.all(episodePromises);
                    const episodeMap: { [key: string]: Episode[] } = {};
                    
                    seasonData.forEach((season: Season, index: number) => {
                        episodeMap[season.Id] = allEpisodes[index];
                    });
                    
                    setEpisodes(episodeMap);
                }
            } catch (err) {
                console.error('Error fetching item details:', err);
                if (err instanceof JellyfinError) {
                    setError(err.message);
                } else {
                    setError('Failed to load item details');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchItemDetails();
    }, [api, id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-xl text-gray-600">Loading...</div>
            </div>
        );
    }

    if (error || !item) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-red-600 bg-red-50 p-4 rounded-md">
                    <div className="font-medium">Error</div>
                    <div className="mt-1">{error || 'Item not found'}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="relative h-96 bg-black">
                {api && item.BackdropImageTags?.[0] && (
                    <img
                        src={getImageUrl(api, item.Id, 'Backdrop')}
                        alt={item.Name}
                        className="w-full h-full object-cover opacity-50"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="max-w-7xl mx-auto flex items-end space-x-6">
                        <div className="w-48 flex-shrink-0">
                            {api && item.ImageTags?.Primary && (
                                <img
                                    src={getImageUrl(api, item.Id)}
                                    alt={item.Name}
                                    className="w-full rounded-lg shadow-lg"
                                />
                            )}
                        </div>
                        <div className="flex-1 text-white">
                            <h1 className="text-4xl font-bold">{item.Name}</h1>
                            <div className="mt-2 flex items-center space-x-4 text-sm">
                                {item.ProductionYear && <span>{item.ProductionYear}</span>}
                                {item.RunTimeTicks && <span>{formatRuntime(item.RunTimeTicks)}</span>}
                                {item.OfficialRating && <span>{item.OfficialRating}</span>}
                            </div>
                            {item.Genres && (
                                <div className="mt-2 text-sm">
                                    {item.Genres.join(' • ')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {item.Overview && (
                    <div className="prose max-w-none mb-8">
                        <h2 className="text-2xl font-bold mb-4">Overview</h2>
                        <p>{item.Overview}</p>
                    </div>
                )}

                {item.Type === 'Series' && seasons.length > 0 && (
                    <div className="mt-8 space-y-8">
                        {seasons.map((season) => (
                            <div key={season.Id} className="bg-white rounded-lg shadow-sm p-6">
                                <div className="flex items-center space-x-4 mb-6">
                                    <div className="flex-shrink-0 w-24">
                                        {api && season.ImageTags?.Primary && (
                                            <img
                                                src={getImageUrl(api, season.Id)}
                                                alt={season.Name}
                                                className="w-full rounded-lg shadow-sm"
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">Season {season.IndexNumber}</h2>
                                        <div className="text-sm text-gray-500">
                                            {episodes[season.Id]?.length || 0} Episodes
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4">
                                    {episodes[season.Id]?.map((episode) => (
                                        <div
                                            key={episode.Id}
                                            className="flex space-x-4 bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex-shrink-0 w-32 h-20 relative">
                                                {api && episode.ImageTags?.Primary ? (
                                                    <img
                                                        src={getImageUrl(api, episode.Id)}
                                                        alt={episode.Name}
                                                        className="w-full h-full object-cover rounded"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                                                        <span className="text-gray-400">No Image</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h3 className="font-medium">
                                                            {episode.IndexNumber}. {episode.Name}
                                                        </h3>
                                                        {episode.Overview && (
                                                            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                                                                {episode.Overview}
                                                            </p>
                                                        )}
                                                        {episode.RunTimeTicks && (
                                                            <div className="mt-1 text-sm text-gray-500">
                                                                {formatRuntime(episode.RunTimeTicks)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {api && (
                                                        <a
                                                            href={getStreamUrl(api, episode.Id)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-shrink-0 p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 ml-4"
                                                        >
                                                            <svg
                                                                className="w-5 h-5"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                                                />
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                />
                                                            </svg>
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {item.Type === 'Movie' && api && (
                    <div className="mt-8">
                        <a
                            href={getStreamUrl(api, item.Id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <svg
                                className="-ml-1 mr-2 h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            Play Movie
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
} 