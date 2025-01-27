import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { createApi, getItemDetails, getSeasons, getEpisodes, getImageUrl, formatRuntime, JellyfinError } from '@/utils/jellyfin';
import { CaptionIndicator } from '@/components/video/CaptionIndicator';
import { extractUSMovieRating } from '@/utils/ratings';
import { Tab } from '@headlessui/react';
import { VideoPlayer } from '@/components/video/VideoPlayer';

interface Person {
    Id: string;
    Name: string;
    Role?: string;
    Type: string;
    PrimaryImageTag?: string;
    ImageBlurHashes?: {
        Primary?: string;
    };
    ProviderIds?: {
        Imdb?: string;
    };
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
    Type: string;
    MediaSources?: any[];
    MediaStreams?: any[];
    Path?: string;
}

interface JellyfinApi {
    baseUrl: string;
    accessToken?: string;
}


const PeopleSection = ({ people, api }: { people: Person[], api: JellyfinApi }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const groupedPeople = people?.reduce((acc: { [key: string]: Person[] }, person) => {
        const type = person.Type || 'Other';
        acc[type] = [...(acc[type] || []), person];
        return acc;
    }, {});

    const PersonThumbnail = ({ person }: { person: Person }) => {
        const imageUrl = person.PrimaryImageTag ? getImageUrl(api, person.Id) : null;
        const blurHash = person.ImageBlurHashes?.Primary;

        return (
            <div className="relative w-8 h-8 rounded-full border-2 border-white shadow-sm">
                {blurHash && (
                    <div
                        className="absolute inset-0 rounded-full overflow-hidden"
                        style={{
                            backgroundImage: `url(data:image/jpeg;base64,${blurHash})`,
                            backgroundSize: 'cover',
                            filter: 'blur(10px)',
                            transform: 'scale(1.2)'
                        }}
                    />
                )}
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={person.Name}
                        className="w-full h-full rounded-full object-cover relative z-10"
                    />
                ) : (
                    <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center relative z-10">
                        <span className="text-gray-500 text-xs">
                            {person.Name?.[0]}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    const CollapsedPreview = () => {
        const director = groupedPeople['Director']?.[0];
        const actors = groupedPeople['Actor']?.slice(0, 3) || [];

        return (
            <div className="flex items-center space-x-4">
                <div className="flex items-center">
                    {director && (
                        <div className="flex items-center space-x-2">
                            <PersonThumbnail person={director} />
                            <div className="text-sm">
                                <span className="text-gray-500">Director:</span>{' '}
                                <span className="font-medium">{director.Name}</span>
                            </div>
                        </div>
                    )}
                </div>
                {actors.length > 0 && (
                    <div className="flex items-center space-x-3">
                        <div className="h-4 w-px bg-gray-300"></div>
                        <div className="flex items-center space-x-2">
                            <div className="flex -space-x-2">
                                {actors.map((actor) => (
                                    <PersonThumbnail key={actor.Id} person={actor} />
                                ))}
                            </div>
                            <div className="text-sm">
                                <span className="text-gray-500">Starring:</span>{' '}
                                <span className="font-medium">
                                    {actors.map(a => a.Name).join(', ')}
                                    {groupedPeople['Actor']?.length > 3 && ' and others'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const PersonCard = ({ person }: { person: Person }) => {
        const imageUrl = person.PrimaryImageTag ? getImageUrl(api, person.Id) : null;
        const blurHash = person.ImageBlurHashes?.Primary;
        const imdbId = person.ProviderIds?.Imdb;
        const imdbUrl = imdbId ? `https://www.imdb.com/name/${imdbId}` : null;

        const CardContent = () => (
            <div className="flex flex-col items-center p-4 rounded-xl transition-all duration-200 hover:bg-gray-50 group">
                <div className="relative w-20 h-20 mb-3">
                    {blurHash && (
                        <div
                            className="absolute inset-0 rounded-full overflow-hidden"
                            style={{
                                backgroundImage: `url(data:image/jpeg;base64,${blurHash})`,
                                backgroundSize: 'cover',
                                filter: 'blur(10px)',
                                transform: 'scale(1.2)'
                            }}
                        />
                    )}
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={person.Name}
                            className="w-full h-full rounded-full object-cover relative z-10 ring-2 ring-white shadow-lg transition-transform duration-200 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative z-10 ring-2 ring-white shadow-lg">
                            <span className="text-2xl font-medium text-gray-500">
                                {person.Name?.[0]}
                            </span>
                        </div>
                    )}
                    {imdbUrl && (
                        <div className="absolute -bottom-1 -right-1 z-20 bg-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <svg
                                className="w-5 h-5 text-yellow-500"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M12.5 2C6.81 2 2 6.81 2 12.5S6.81 23 12.5 23 23 18.19 23 12.5 18.19 2 12.5 2zM5.2 17.3V6.7h2.2v10.6H5.2zm8.8 0h-2.2v-5.3L9.5 6.7h2.4l1.5 3.7 1.5-3.7h2.4l-2.3 5.3v5.3z" />
                            </svg>
                        </div>
                    )}
                </div>
                <div className="text-center">
                    <h3 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors duration-200">
                        {person.Name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {person.Role || person.Type}
                    </p>
                </div>
            </div>
        );

        if (imdbUrl) {
            return (
                <a
                    href={imdbUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                >
                    <CardContent />
                </a>
            );
        }

        return <CardContent />;
    };

    return (
        <div className="mt-8 bg-white rounded-lg shadow-sm">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between text-left"
            >
                <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                        Cast &amp; Crew
                    </h2>
                    {!isExpanded && <CollapsedPreview />}
                </div>
                <svg
                    className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''
                        }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </button>

            {isExpanded && (
                <div className="px-6 pb-6">
                    {Object.entries(groupedPeople).map(([type, people]) => (
                        <div key={type} className="mt-6 first:mt-0">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                {type}s ({people.length})
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {people.map((person) => (
                                    <PersonCard key={person.Id} person={person} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


const SeriesDetailPage = () => {
    const router = useRouter();
    const { id } = router.query;
    const [api, setApi] = useState<JellyfinApi | null>(null);
    const [seriesDetails, setSeriesDetails] = useState<any>(null);
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [episodes, setEpisodes] = useState<{ [key: string]: Episode[] }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [playingEpisode, setPlayingEpisode] = useState<Episode | null>(null);

    useEffect(() => {
        const fetchSeriesDetails = async () => {
            if (!id || typeof id !== 'string') return;

            try {
                setLoading(true);
                setError(null);
                const server = localStorage.getItem('jellyfin_server');
                const token = localStorage.getItem('jellyfin_token');
                const userId = localStorage.getItem('jellyfin_user_id');
                if (!server || !token || !userId) {
                    setError('Missing server, token, or user ID.');
                    return;
                }
                const api = createApi(server);
                api.accessToken = token;
                setApi(api);

                const details = await getItemDetails(api, id, userId);
                setSeriesDetails(details);

                const seasonData = await getSeasons(api, id, userId);
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


            } catch (err: any) {
                console.error('Error fetching series details:', err);
                setError(err instanceof Error ? err.message : 'Failed to load series details');
            } finally {
                setLoading(false);
            }
        };

        fetchSeriesDetails();
    }, [id]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-xl text-gray-600">Loading series details...</div></div>;
    }

    if (error || !seriesDetails) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-red-600 bg-red-50 p-4 rounded-md"><div className="font-medium">Error</div><div className="mt-1">{error || 'Series not found'}</div></div></div>;
    }


    return (
        <>
            {playingEpisode && api && (
                <VideoPlayer
                    item={playingEpisode}
                    api={api}
                    onClose={() => setPlayingEpisode(null)}
                />
            )}
            <div className="min-h-screen bg-gray-50">
                <div className="relative h-96 bg-black">
                    {api && seriesDetails?.BackdropImageTags?.[0] && (
                        <img
                            src={getImageUrl(api, seriesDetails.Id, 'Backdrop')}
                            alt={seriesDetails.Name}
                            className="w-full h-full object-cover object-top opacity-50"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-8">
                        <div className="max-w-7xl mx-auto flex items-end space-x-6">
                            <div className="w-48 flex-shrink-0">
                                {api && seriesDetails?.ImageTags?.Primary && (
                                    <img
                                        src={getImageUrl(api, seriesDetails.Id)}
                                        alt={seriesDetails.Name}
                                        className="w-full rounded-lg shadow-lg"
                                    />
                                )}
                            </div>
                            <div className="flex-1 text-white">
                                <div className="flex items-start justify-between">
                                    <div>
                                        {api && seriesDetails?.ImageTags?.Logo ? (
                                            <div className="max-w-[300px] h-[60px] mb-4 flex items-center">
                                                <img
                                                    src={getImageUrl(api, seriesDetails.Id, 'Logo' as 'Primary')}
                                                    alt={seriesDetails.Name}
                                                    className="max-h-full w-auto object-contain filter drop-shadow-lg"
                                                />
                                            </div>
                                        ) : (
                                            <h1 className="text-4xl font-bold">{seriesDetails?.Name}</h1>
                                        )}
                                        <div className="mt-2 flex items-center space-x-4 text-sm">
                                            {seriesDetails?.ProductionYear && <span>{seriesDetails.ProductionYear}</span>}
                                            {seriesDetails?.RunTimeTicks && <span>{formatRuntime(seriesDetails.RunTimeTicks)}</span>}
                                            {extractUSMovieRating(seriesDetails?.OfficialRating) && (
                                                <span>{extractUSMovieRating(seriesDetails?.OfficialRating)}</span>
                                            )}
                                            <CaptionIndicator mediaStreams={seriesDetails?.MediaStreams} />
                                        </div>
                                        {seriesDetails?.Genres && (
                                            <div className="mt-2 text-sm">
                                                {seriesDetails.Genres.join(' • ')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    {seriesDetails?.Overview && (
                        <div className="prose max-w-none mb-8">
                            <h2 className="text-2xl font-bold mb-4">Overview</h2>
                            <p>{seriesDetails.Overview}</p>
                        </div>
                    )}

                    {seasons.length > 0 && (
                        <div className="mt-8">
                            <Tab.Group>
                                <Tab.List className="flex space-x-1.5 mb-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                                    {seasons.map((season) => (
                                        <Tab
                                            key={season.Id}
                                            className={({ selected }) =>
                                                `px-4 py-3 rounded-lg font-medium text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 ${selected
                                                ? 'bg-white border-2 border-indigo-500 text-gray-900 shadow-sm'
                                                : 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-transparent'
                                                } relative flex flex-col items-center justify-center transition-colors duration-150`
                                            }
                                        >
                                            {api && season.ImageTags?.Primary ? (
                                                <div className="flex flex-col items-center w-[200px]">
                                                    <img
                                                        src={getImageUrl(api, season.Id, 'Primary')}
                                                        alt={season.Name}
                                                        className="h-48 w-auto rounded-md object-cover mb-3"
                                                    />
                                                    <div className="text-center">
                                                        <div className="text-inherit">Season {season.IndexNumber}</div>
                                                        <div className="text-sm mt-1 text-inherit opacity-80">
                                                            {episodes[season.Id]?.length || 0} Episodes
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center w-[200px]">
                                                    <div className="text-center">
                                                        <div className="text-inherit">Season {season.IndexNumber}</div>
                                                        <div className="text-sm mt-1 text-inherit opacity-80">
                                                            {episodes[season.Id]?.length || 0} Episodes
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                          </Tab>
                                     ))}
                                </Tab.List>
                                <Tab.Panels>
                                    {seasons.map((season) => (
                                        <Tab.Panel key={season.Id} className="space-y-8">
                                            <div className="bg-white rounded-lg shadow-sm p-6">
                                                <div className="grid gap-4">
                                                    {episodes[season.Id]?.map((episode) => (
                                                        <div
                                                            key={episode.Id}
                                                            className="flex space-x-4 bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors group"
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
                                                                    <div className="flex items-start justify-between w-full">
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
                                                                        <button
                                                                            onClick={() => setPlayingEpisode(episode)}
                                                                            className="flex-shrink-0 p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
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
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </Tab.Panel>
                                    ))}
                                </Tab.Panels>
                            </Tab.Group>
                        </div>
                    )}

                    {seriesDetails?.People && seriesDetails.People.length > 0 && (
                        <div className="mt-12">
                            <PeopleSection people={seriesDetails.People} api={api as JellyfinApi} />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default SeriesDetailPage;