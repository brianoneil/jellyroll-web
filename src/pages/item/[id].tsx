import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { createApi, getItemDetails, getSeasons, getEpisodes, getImageUrl, getStreamUrl, getLowestQualityStreamUrl, formatRuntime, JellyfinError } from '@/utils/jellyfin';

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
}

interface JellyfinApi {
    baseUrl: string;
    accessToken?: string;
}

interface Chapter {
    StartPositionTicks: number;
    Name: string;
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
                                <path d="M12.5 2C6.81 2 2 6.81 2 12.5S6.81 23 12.5 23 23 18.19 23 12.5 18.19 2 12.5 2zM5.2 17.3V6.7h2.2v10.6H5.2zm8.8 0h-2.2v-5.3L9.5 6.7h2.4l1.5 3.7 1.5-3.7h2.4l-2.3 5.3v5.3z"/>
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
                        Cast & Crew
                    </h2>
                    {!isExpanded && <CollapsedPreview />}
                </div>
                <svg
                    className={`w-5 h-5 transform transition-transform ${
                        isExpanded ? 'rotate-180' : ''
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

export default function ItemDetail() {
    const router = useRouter();
    const { id } = router.query;
    const [api, setApi] = useState<any>(null);
    const [item, setItem] = useState<any>(null);
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [episodes, setEpisodes] = useState<{ [key: string]: Episode[] }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

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

    const VideoPlayer = ({ onClose }: { onClose: () => void }) => {
        const [isControlsVisible, setIsControlsVisible] = useState(true);
        const [controlsTimer, setControlsTimer] = useState<NodeJS.Timeout | null>(null);
        const [currentTime, setCurrentTime] = useState(0);
        const [duration, setDuration] = useState(0);
        const [volume, setVolume] = useState(1);
        const [isSeeking, setIsSeeking] = useState(false);
        const [isFullscreen, setIsFullscreen] = useState(false);
        const [isVideoPlaying, setIsVideoPlaying] = useState(true);
        const [isLoading, setIsLoading] = useState(true);
        const videoRef = useRef<HTMLVideoElement>(null);
        const progressRef = useRef<HTMLDivElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const [previewTime, setPreviewTime] = useState<number | null>(null);
        const previewCanvasRef = useRef<HTMLCanvasElement>(null);
        const [previewPosition, setPreviewPosition] = useState<number>(0);
        const progressReportTimer = useRef<NodeJS.Timeout | null>(null);
        const previewCache = useRef<Map<number, string>>(new Map());
        const previewVideoRef = useRef<HTMLVideoElement>(null);

        useEffect(() => {
            const previewVideo = previewVideoRef.current;
            if (!previewVideo) return;

            // Set up preview video with lowest quality stream
            previewVideo.src = getLowestQualityStreamUrl(api, item.Id);
            previewVideo.muted = true;
            previewVideo.preload = "auto";

            const handleSeeked = () => {
                const canvas = previewCanvasRef.current;
                const ctx = canvas?.getContext('2d');
                if (!canvas || !ctx || !previewVideo) return;

                try {
                    // Calculate dimensions to maintain aspect ratio
                    const videoAspect = previewVideo.videoWidth / previewVideo.videoHeight;
                    const canvasAspect = canvas.width / canvas.height;
                    
                    let drawWidth = canvas.width;
                    let drawHeight = canvas.height;
                    let offsetX = 0;
                    let offsetY = 0;

                    if (videoAspect > canvasAspect) {
                        // Video is wider than canvas - fill height
                        drawHeight = canvas.height;
                        drawWidth = canvas.height * videoAspect;
                        offsetX = (canvas.width - drawWidth) / 2;
                    } else {
                        // Video is taller than canvas - fill width
                        drawWidth = canvas.width;
                        drawHeight = canvas.width / videoAspect;
                        offsetY = (canvas.height - drawHeight) / 2;
                    }

                    // Clear canvas with translucent black
                    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(previewVideo, offsetX, offsetY, drawWidth, drawHeight);
                    
                    // Cache the frame as a data URL with lower quality
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                    previewCache.current.set(Math.floor(previewVideo.currentTime), dataUrl);
                } catch (error) {
                    console.error('Error drawing preview frame:', error);
                }
            };

            previewVideo.addEventListener('seeked', handleSeeked);
            return () => previewVideo.removeEventListener('seeked', handleSeeked);
        }, [api, item?.Id]);

        const debouncedSeek = useCallback(
            (() => {
                let timeoutId: NodeJS.Timeout | null = null;
                return (time: number) => {
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                    }
                    
                    const roundedTime = Math.floor(time);
                    // Check if we have the frame cached
                    const cachedFrame = previewCache.current.get(roundedTime);
                    if (cachedFrame) {
                        const canvas = previewCanvasRef.current;
                        const ctx = canvas?.getContext('2d');
                        if (canvas && ctx) {
                            const img = new Image();
                            img.onload = () => {
                                ctx.clearRect(0, 0, canvas.width, canvas.height);
                                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            };
                            img.src = cachedFrame;
                            return;
                        }
                    }

                    // If not cached, generate the frame
                    timeoutId = setTimeout(() => {
                        if (previewVideoRef.current) {
                            previewVideoRef.current.currentTime = time;
                        }
                    }, 150); // 150ms debounce delay
                };
            })(),
            [api, item?.Id]
        );

        const updateControlsVisibility = () => {
            setIsControlsVisible(true);
            
            if (controlsTimer) {
                clearTimeout(controlsTimer);
            }
            
            const timer = setTimeout(() => {
                if (videoRef.current?.paused === false) {
                    setIsControlsVisible(false);
                }
            }, 3000);
            
            setControlsTimer(timer);
        };

        useEffect(() => {
            const video = videoRef.current;
            if (!video) return;

            const timeUpdate = () => setCurrentTime(video.currentTime);
            const durationChange = () => setDuration(video.duration);
            const playStateChange = () => setIsVideoPlaying(!video.paused);

            video.addEventListener('timeupdate', timeUpdate);
            video.addEventListener('durationchange', durationChange);
            video.addEventListener('play', playStateChange);
            video.addEventListener('pause', playStateChange);

            return () => {
                video.removeEventListener('timeupdate', timeUpdate);
                video.removeEventListener('durationchange', durationChange);
                video.removeEventListener('play', playStateChange);
                video.removeEventListener('pause', playStateChange);
                if (controlsTimer) {
                    clearTimeout(controlsTimer);
                }
            };
        }, [controlsTimer]);

        const formatTime = (seconds: number) => {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };

        const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
            if (!progressRef.current || !videoRef.current) return;
            
            const rect = progressRef.current.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            videoRef.current.currentTime = pos * duration;
        };

        const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newVolume = parseFloat(e.target.value);
            setVolume(newVolume);
            if (videoRef.current) {
                videoRef.current.volume = newVolume;
            }
        };

        const togglePlay = () => {
            if (!videoRef.current) return;
            if (isVideoPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
        };

        const toggleFullscreen = () => {
            if (!containerRef.current) return;

            if (!document.fullscreenElement) {
                containerRef.current.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        };

        useEffect(() => {
            const handleFullscreenChange = () => {
                setIsFullscreen(!!document.fullscreenElement);
            };

            document.addEventListener('fullscreenchange', handleFullscreenChange);
            return () => {
                document.removeEventListener('fullscreenchange', handleFullscreenChange);
            };
        }, []);

        const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
            if (!progressRef.current) return;
            
            const rect = progressRef.current.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            const time = pos * duration;
            
            // Clear the current preview
            const canvas = previewCanvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            
            setPreviewTime(time);
            setPreviewPosition(e.clientX - rect.left);
            debouncedSeek(time);
        };

        return (
            <div 
                ref={containerRef}
                className="fixed inset-0 bg-black z-50"
                onMouseMove={updateControlsVisibility}
            >
                <div 
                    className="relative w-full h-full"
                    onClick={(e) => {
                        // Don't toggle if clicking on controls or buttons
                        if (
                            e.target instanceof Element && 
                            (e.target.closest('.video-controls') || 
                             e.target.closest('button'))
                        ) {
                            return;
                        }
                        togglePlay();
                    }}
                >
                    {/* Main video */}
                    <video
                        ref={videoRef}
                        className="w-full h-full"
                        autoPlay
                        crossOrigin="anonymous"
                        src={getStreamUrl(api, item.Id)}
                        onSeeking={() => setIsSeeking(true)}
                        onSeeked={() => setIsSeeking(false)}
                        onLoadStart={() => setIsLoading(true)}
                        onCanPlay={() => setIsLoading(false)}
                    />

                    {/* Hidden preview video */}
                    <video
                        ref={previewVideoRef}
                        className="hidden"
                        crossOrigin="anonymous"
                        preload="auto"
                        muted
                    />

                    {/* Loading/Seeking indicator */}
                    {(isLoading || isSeeking) && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg flex items-center space-x-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="text-white text-sm font-medium">Loading...</span>
                            </div>
                        </div>
                    )}

                    {/* Info overlay when paused */}
                    {!isVideoPlaying && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                            <div className="max-w-2xl w-full mx-auto p-6">
                                <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 shadow-lg">
                                    <div className="flex items-start space-x-4">
                                        {item?.ImageTags?.Primary && (
                                            <img
                                                src={getImageUrl(api, item.Id)}
                                                alt={item.Name}
                                                className="w-24 h-36 object-cover rounded shadow-md flex-shrink-0"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-white text-xl font-semibold truncate">
                                                {item?.Name}
                                            </h2>
                                            <div className="mt-1 text-gray-300 text-sm space-x-2">
                                                {item?.ProductionYear && (
                                                    <span>{item.ProductionYear}</span>
                                                )}
                                                {item?.RunTimeTicks && (
                                                    <span>• {formatRuntime(item.RunTimeTicks)}</span>
                                                )}
                                            </div>
                                            {item?.Overview && (
                                                <p className="mt-2 text-gray-400 text-sm line-clamp-2">
                                                    {item.Overview}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Back button and controls ... */}
                    {isControlsVisible && (
                        <button
                            onClick={() => {
                                if (videoRef.current) {
                                    videoRef.current.pause();
                                }
                                onClose();
                            }}
                            className="absolute top-4 left-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors duration-200 z-50"
                        >
                            <svg 
                                className="w-6 h-6" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </button>
                    )}

                    {/* Custom Controls */}
                    <div 
                        className={`video-controls absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-4 py-6 transition-opacity duration-200 ${
                            isControlsVisible ? 'opacity-100' : 'opacity-0'
                        }`}
                    >
                        {/* Progress Bar */}
                        <div 
                            ref={progressRef}
                            className="relative h-1 bg-white/30 cursor-pointer mb-4"
                            onClick={handleProgressClick}
                            onMouseMove={!isVideoPlaying ? handleProgressHover : undefined}
                            onMouseLeave={() => setPreviewTime(null)}
                        >
                            {/* Progress */}
                            <div 
                                className="absolute top-0 left-0 h-full bg-indigo-500"
                                style={{ width: `${(currentTime / duration) * 100}%` }}
                            />
                            
                            {/* Chapter Markers */}
                            {item.Chapters?.map((chapter: Chapter, index: number) => {
                                const position = (chapter.StartPositionTicks / (item.RunTimeTicks || 0)) * 100;
                                return (
                                    <div
                                        key={index}
                                        className="absolute top-0 w-0.5 h-3 -mt-1 bg-white/60 hover:bg-white transition-colors z-10"
                                        style={{ left: `${position}%` }}
                                    />
                                );
                            })}

                            {/* Preview thumbnail */}
                            {previewTime !== null && !isVideoPlaying && (
                                <div 
                                    className="absolute bg-black/60 backdrop-blur-sm rounded-lg overflow-hidden shadow-lg"
                                    style={{ 
                                        left: `${previewPosition}px`,
                                        bottom: '16px',
                                        transform: 'translateX(-50%)',
                                        width: 'min(320px, 30vw)'
                                    }}
                                >
                                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                                        <canvas
                                            ref={previewCanvasRef}
                                            width="320"
                                            height="180"
                                            className="absolute inset-0 w-full h-full"
                                        />
                                    </div>
                                    <div className="text-white text-sm px-3 py-2 text-center">
                                        {formatTime(previewTime)}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center space-x-4">
                            <button 
                                onClick={togglePlay}
                                className="text-white hover:text-indigo-400 transition-colors"
                            >
                                {isVideoPlaying ? (
                                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                                    </svg>
                                ) : (
                                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z"/>
                                    </svg>
                                )}
                            </button>

                            {/* Time display with preview */}
                            <div className="flex items-center space-x-2 w-[200px]">
                                <span className="text-white text-sm font-mono">
                                    <span className="inline-block min-w-[80px] text-right">
                                        {formatTime(currentTime)}
                                    </span>
                                    {' / '}
                                    <span className="inline-block min-w-[80px] text-right">
                                        {formatTime(duration)}
                                    </span>
                                </span>
                            </div>

                            <div className="text-white text-sm ml-4">
                                Preview: {previewTime !== null ? formatTime(previewTime) : 'No hover'}
                            </div>

                            <div className="flex items-center space-x-2">
                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                                </svg>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    className="w-24"
                                />
                            </div>

                            <div className="flex items-center space-x-4 ml-auto">
                                {/* Fullscreen button */}
                                <button
                                    onClick={toggleFullscreen}
                                    className="text-white hover:text-indigo-400 transition-colors"
                                >
                                    {isFullscreen ? (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                d="M9 20H5a2 2 0 01-2-2v-4m14-4v4a2 2 0 01-2 2h-4m0-16h4a2 2 0 012 2v4M5 5a2 2 0 012-2h4"
                                            />
                                        </svg>
                                    ) : (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M15 3h6m0 0v6m0-6L14 10M9 21H3m0 0v-6m0 6l7-7"
                                            />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

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
        <>
            {isPlaying && (
                <VideoPlayer 
                    onClose={() => setIsPlaying(false)} 
                />
            )}
            <div className="min-h-screen bg-gray-50">
                <div className="relative h-96 bg-black">
                    {api && item?.BackdropImageTags?.[0] && (
                        <img
                            src={getImageUrl(api, item.Id, 'Backdrop')}
                            alt={item.Name}
                            className="w-full h-full object-cover object-top opacity-50"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-8">
                        <div className="max-w-7xl mx-auto flex items-end space-x-6">
                            <div className="w-48 flex-shrink-0">
                                {api && item?.ImageTags?.Primary && (
                                    <img
                                        src={getImageUrl(api, item.Id)}
                                        alt={item.Name}
                                        className="w-full rounded-lg shadow-lg"
                                    />
                                )}
                            </div>
                            <div className="flex-1 text-white">
                                <div className="flex items-start justify-between">
                                    <div>
                                        {api && item?.ImageTags?.Logo ? (
                                            <div className="max-w-[200px] max-h-[60px] mb-4">
                                                <img
                                                    src={getImageUrl(api, item.Id, 'Logo' as 'Primary')}
                                                    alt={item.Name}
                                                    className="w-full h-full object-contain filter drop-shadow-lg"
                                                />
                                            </div>
                                        ) : (
                                            <h1 className="text-4xl font-bold">{item?.Name}</h1>
                                        )}
                                        <div className="mt-2 flex items-center space-x-4 text-sm">
                                            {item?.ProductionYear && <span>{item.ProductionYear}</span>}
                                            {item?.RunTimeTicks && <span>{formatRuntime(item.RunTimeTicks)}</span>}
                                            {item?.OfficialRating && <span>{item.OfficialRating}</span>}
                                        </div>
                                        {item?.Genres && (
                                            <div className="mt-2 text-sm">
                                                {item.Genres.join(' • ')}
                                            </div>
                                        )}
                                    </div>
                                    {item?.Type === 'Movie' && api && (
                                        <button
                                            onClick={() => setIsPlaying(true)}
                                            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white font-medium transition-colors shadow-lg"
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
                                            <span>Play Movie</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    {item?.Overview && (
                        <div className="prose max-w-none mb-8">
                            <h2 className="text-2xl font-bold mb-4">Overview</h2>
                            <p>{item.Overview}</p>
                        </div>
                    )}

                    {item?.People && item.People.length > 0 && (
                        <PeopleSection people={item.People} api={api} />
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
                </div>
            </div>
        </>
    );
} 