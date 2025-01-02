import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createApi, getUserLibraries, getLatestMedia, getImageUrl, getStreamUrl, JellyfinError } from '@/utils/jellyfin';

interface Library {
    Name: string;
    Id: string;
    Type: string;
    CollectionType?: string;
}

interface MediaItem {
    Id: string;
    Name: string;
    Type: string;
    ImageTags?: { [key: string]: string };
    MediaType?: string;
}

interface MediaResult {
    libraryId: string;
    items: MediaItem[];
}

interface JellyfinApi {
    baseUrl: string;
    accessToken?: string;
}

export default function Home() {
    const router = useRouter();
    const [username, setUsername] = useState<string | null>(null);
    const [libraries, setLibraries] = useState<Library[]>([]);
    const [latestMedia, setLatestMedia] = useState<{ [key: string]: MediaItem[] }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [api, setApi] = useState<JellyfinApi | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('jellyfin_token');
        const user = localStorage.getItem('jellyfin_user');
        const userId = localStorage.getItem('jellyfin_user_id');
        const server = localStorage.getItem('jellyfin_server');

        if (!token || !user || !userId || !server) {
            router.push('/login');
            return;
        }

        setUsername(user);
        const jellyfinApi = createApi(server);
        jellyfinApi.accessToken = token;
        setApi(jellyfinApi);
    }, [router]);

    useEffect(() => {
        const fetchLibraries = async () => {
            if (!api) return;

            try {
                setLoading(true);
                setError(null);
                const userId = localStorage.getItem('jellyfin_user_id');
                if (!userId) {
                    throw new JellyfinError('User ID not found');
                }

                const libs = await getUserLibraries(api, userId);
                console.log('Libraries:', libs);
                setLibraries(libs);

                // Fetch latest media for each library
                const mediaPromises = libs
                    .filter((library: Library) => library.Type === 'CollectionFolder')
                    .map(async (library: Library) => {
                        try {
                            const items = await getLatestMedia(api, userId, library.Id);
                            return { libraryId: library.Id, items } as MediaResult;
                        } catch (err) {
                            console.error(`Error fetching media for library ${library.Name}:`, err);
                            return { libraryId: library.Id, items: [] } as MediaResult;
                        }
                    });

                const mediaResults = await Promise.all(mediaPromises);
                const mediaMap: { [key: string]: MediaItem[] } = {};
                mediaResults.forEach((result: MediaResult) => {
                    if (result.items.length > 0) {
                        mediaMap[result.libraryId] = result.items;
                    }
                });

                setLatestMedia(mediaMap);
            } catch (err) {
                console.error('Error fetching libraries:', err);
                if (err instanceof JellyfinError) {
                    setError(err.message);
                } else {
                    setError('Failed to load content');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchLibraries();
    }, [api]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-xl text-gray-600">Loading your media...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-red-600 bg-red-50 p-4 rounded-md">
                    <div className="font-medium">Error</div>
                    <div className="mt-1">{error}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Welcome, {username}
                    </h1>
                    <button
                        onClick={() => {
                            localStorage.clear();
                            router.push('/login');
                        }}
                        className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                    >
                        Sign Out
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {libraries.map((library) => (
                    <div key={library.Id} className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{library.Name}</h2>
                        {latestMedia[library.Id] && latestMedia[library.Id].length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {latestMedia[library.Id].map((item) => (
                                    <div
                                        key={item.Id}
                                        className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow duration-200 group relative"
                                    >
                                        <div className="aspect-w-2 aspect-h-3 relative cursor-pointer"
                                             onClick={() => router.push(`/item/${item.Id}`)}>
                                            {api && item.ImageTags?.Primary && (
                                                <img
                                                    src={getImageUrl(api, item.Id)}
                                                    alt={item.Name}
                                                    className="object-cover w-full h-full"
                                                />
                                            )}
                                            {item.MediaType === 'Video' && (
                                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-opacity flex items-center justify-center">
                                                    <a
                                                        href={api ? getStreamUrl(api, item.Id) : '#'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-3 rounded-full bg-white bg-opacity-90 text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
                                                        title="Play video"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <svg 
                                                            xmlns="http://www.w3.org/2000/svg" 
                                                            className="h-8 w-8" 
                                                            viewBox="0 0 20 20" 
                                                            fill="currentColor"
                                                        >
                                                            <path 
                                                                fillRule="evenodd" 
                                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" 
                                                                clipRule="evenodd" 
                                                            />
                                                        </svg>
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                        <div 
                                            className="p-2 cursor-pointer hover:bg-gray-50"
                                            onClick={() => router.push(`/item/${item.Id}`)}
                                        >
                                            <h3 className="text-sm font-medium text-gray-900 truncate">
                                                {item.Name}
                                            </h3>
                                            <p className="text-xs text-gray-500">{item.Type}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500">No media items found in this library</div>
                        )}
                    </div>
                ))}
            </main>
        </div>
    );
} 