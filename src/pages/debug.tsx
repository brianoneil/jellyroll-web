import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { createApi, getUserLibraries, getLatestMedia, getItemDetails, getImageUrl, JellyfinError } from '@/utils/jellyfin';
import { decode } from 'blurhash';

interface DebugItem {
    type: string;
    name: string;
    data: any;
}

const isImageField = (key: string, value: any) => {
    // Check if it's an ImageTags or ImageBlurHashes object
    if ((key === 'ImageTags' || key === 'ImageBlurHashes') && typeof value === 'object') return false;
    
    // Specific fields that contain "image" but aren't actually images
    const nonImageFields = [
        'ImageDateModified',
        'PrimaryImageTimestamp',
        'ImageBlurHashes',
        'ImageTags'
    ];
    
    if (nonImageFields.includes(key)) return false;
    
    // Check if it's a path to an image
    const imageKeywords = ['image', 'thumb', 'screenshot', 'backdrop', 'logo', 'banner'];
    return imageKeywords.some(keyword => key.toLowerCase().includes(keyword));
};

const getImageType = (name: string): 'Primary' | 'Backdrop' | 'Thumb' => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('backdrop')) return 'Backdrop';
    if (lowerName.includes('thumb')) return 'Thumb';
    return 'Primary';
};

const isUrlField = (key: string) => key.toLowerCase().includes('url');

const BlurHashCanvas = ({ hash, width = 32, height = 32, punch = 1 }: { 
    hash: string, 
    width?: number, 
    height?: number,
    punch?: number 
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !hash) return;

        try {
            const pixels = decode(hash, width, height, punch);
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const imageData = ctx.createImageData(width, height);
            imageData.data.set(pixels);
            ctx.putImageData(imageData, 0, 0);
        } catch (error) {
            console.error('Error decoding blurhash:', error);
        }
    }, [hash, width, height, punch]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="rounded shadow-sm"
            style={{ 
                width: width * 4 + 'px', 
                height: height * 4 + 'px',
                imageRendering: 'pixelated'
            }}
        />
    );
};

const ImageDebug = ({ name, itemId, imageType, api, blurHash }: { 
    name: string, 
    itemId: string, 
    imageType: 'Primary' | 'Backdrop' | 'Thumb',
    api: any,
    blurHash?: string 
}) => {
    const imageUrl = getImageUrl(api, itemId, imageType);

    return (
        <div>
            <div className="text-sm text-gray-600 break-all">
                <span className="font-medium">{imageType}:</span> {imageUrl}
                <span className="text-gray-400 ml-2">(ID: {itemId})</span>
            </div>
            <div className="flex gap-4 mt-2">
                <img 
                    src={imageUrl}
                    alt={`${name} (${imageType})`}
                    className="max-w-xs rounded shadow-sm"
                />
                {blurHash && (
                    <div className="text-sm text-gray-500">
                        <div className="font-medium mb-1">Blur Hash Preview:</div>
                        <BlurHashCanvas hash={blurHash} width={32} height={32} />
                        <div className="mt-2">
                            <div className="font-medium mb-1">Blur Hash Value:</div>
                            <pre className="bg-gray-50 p-2 rounded whitespace-pre-wrap break-all">
                                {blurHash}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ChapterTimeline = ({ chapters, runTimeTicks }: { chapters: any[], runTimeTicks: number }) => {
    const formatTime = (ticks: number) => {
        const seconds = Math.floor(ticks / 10000000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">Chapter Timeline:</div>
            <div className="relative h-8 bg-gray-200 rounded">
                {chapters.map((chapter, index) => {
                    const position = (chapter.StartPositionTicks / runTimeTicks) * 100;
                    return (
                        <div
                            key={index}
                            className="absolute h-full w-1 bg-blue-500 cursor-pointer group"
                            style={{ left: `${position}%` }}
                            title={`${chapter.Name} - ${formatTime(chapter.StartPositionTicks)}`}
                        >
                            <div className="hidden group-hover:block absolute bottom-full mb-1 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                {chapter.Name}
                                <br />
                                {formatTime(chapter.StartPositionTicks)}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0:00:00</span>
                <span>{formatTime(runTimeTicks)}</span>
            </div>
        </div>
    );
};

const FieldValue = ({ name, value, api, itemId, parentData }: { 
    name: string, 
    value: any, 
    api: any, 
    itemId?: string,
    parentData?: any
}) => {
    if (value === null || value === undefined) {
        return <span className="text-gray-400">null</span>;
    }

    // If this is an object with an Id field, use that as the itemId for nested values
    const currentItemId = typeof value === 'object' && value?.Id ? value.Id : itemId;

    if (typeof value === 'object' && !Array.isArray(value)) {
        // Special handling for ImageTags to show all available images
        if (name === 'ImageTags' && value !== null && currentItemId) {
            return (
                <div className="pl-4 border-l-2 border-gray-200">
                    {Object.keys(value).map((imageType) => {
                        const blurHash = parentData?.ImageBlurHashes?.[imageType];
                        return (
                            <div key={imageType} className="mt-4">
                                <ImageDebug 
                                    name={name}
                                    itemId={currentItemId}
                                    imageType={imageType as 'Primary' | 'Backdrop' | 'Thumb'}
                                    api={api}
                                    blurHash={typeof blurHash === 'string' ? blurHash : blurHash?.[value[imageType]]}
                                />
                            </div>
                        );
                    })}
                </div>
            );
        }

        // Special handling for ImageBlurHashes to show them with their corresponding images
        if (name === 'ImageBlurHashes' && value !== null) {
            return (
                <div className="pl-4 border-l-2 border-gray-200">
                    {Object.entries(value as Record<string, string | Record<string, string>>).map(([imageType, blurHashData]) => {
                        // Handle both string blur hashes and nested objects
                        if (typeof blurHashData === 'string') {
                            return (
                                <div key={imageType} className="mt-4">
                                    <div className="font-medium text-gray-700 mb-2">{imageType}:</div>
                                    <div className="flex gap-4">
                                        <BlurHashCanvas hash={blurHashData} width={32} height={32} />
                                        <pre className="bg-gray-50 p-2 rounded text-sm flex-1">
                                            {blurHashData}
                                        </pre>
                                    </div>
                                </div>
                            );
                        } else if (typeof blurHashData === 'object' && blurHashData !== null) {
                            return (
                                <div key={imageType} className="mt-4">
                                    <div className="font-medium text-gray-700 mb-2">{imageType}:</div>
                                    {Object.entries(blurHashData).map(([key, hash]) => (
                                        <div key={key} className="mt-2">
                                            <div className="text-sm text-gray-600 mb-1">{key}:</div>
                                            <div className="flex gap-4">
                                                <BlurHashCanvas hash={hash as string} width={32} height={32} />
                                                <pre className="bg-gray-50 p-2 rounded text-sm flex-1">
                                                    {hash}
                                                </pre>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>
            );
        }

        return (
            <div className="pl-4 border-l-2 border-gray-200">
                {Object.entries(value).map(([key, val]) => (
                    <div key={key} className="mt-1">
                        <span className="font-medium text-gray-700">{key}:</span>{' '}
                        <FieldValue 
                            name={key} 
                            value={val} 
                            api={api} 
                            itemId={currentItemId}
                            parentData={value}
                        />
                    </div>
                ))}
            </div>
        );
    }

    if (Array.isArray(value)) {
        // Special handling for array of blur hashes
        if (name === 'ImageBlurHashes') {
            return (
                <div className="pl-4 border-l-2 border-gray-200">
                    {value.map((hash: string, index: number) => (
                        <div key={index} className="mt-2">
                            <div className="text-sm text-gray-600 mb-1">Hash {index + 1}:</div>
                            <div className="flex gap-4">
                                <BlurHashCanvas hash={hash} width={32} height={32} />
                                <pre className="bg-gray-50 p-2 rounded text-sm flex-1">
                                    {hash}
                                </pre>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        // Special handling for chapters
        if (name === 'Chapters' && parentData?.RunTimeTicks) {
            return (
                <div>
                    <ChapterTimeline chapters={value} runTimeTicks={parentData.RunTimeTicks} />
                    <div className="mt-4 pl-4 border-l-2 border-gray-200">
                        {value.map((item, index) => (
                            <div key={index} className="mt-1">
                                <span className="font-medium text-gray-700">[{index}]:</span>{' '}
                                <FieldValue 
                                    name={`${name}_${index}`} 
                                    value={item} 
                                    api={api} 
                                    itemId={currentItemId}
                                    parentData={value}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="pl-4 border-l-2 border-gray-200">
                {value.map((item, index) => (
                    <div key={index} className="mt-1">
                        <span className="font-medium text-gray-700">[{index}]:</span>{' '}
                        <FieldValue 
                            name={`${name}_${index}`} 
                            value={item} 
                            api={api} 
                            itemId={currentItemId}
                            parentData={value}
                        />
                    </div>
                ))}
            </div>
        );
    }

    if (isImageField(name, value) && typeof value === 'string' && api && currentItemId) {
        const imageType = getImageType(name);
        let blurHash = null;
        
        // Look for blur hash in different possible locations
        if (parentData?.ImageBlurHashes) {
            if (typeof parentData.ImageBlurHashes[imageType] === 'string') {
                blurHash = parentData.ImageBlurHashes[imageType];
            } else if (parentData.ImageBlurHashes[imageType]?.[value]) {
                blurHash = parentData.ImageBlurHashes[imageType][value];
            }
        } else if (name === 'Primary' && parentData?.PrimaryImageBlurHash) {
            blurHash = parentData.PrimaryImageBlurHash;
        }

        return (
            <ImageDebug 
                name={name}
                itemId={currentItemId}
                imageType={imageType}
                api={api}
                blurHash={blurHash}
            />
        );
    }

    if (isUrlField(name) && typeof value === 'string') {
        return <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{value}</a>;
    }

    return <span className="text-gray-900 break-all">{String(value)}</span>;
};

const ItemDebug = ({ item, api }: { item: any, api: any }) => {
    const [expanded, setExpanded] = useState(false);
    const [details, setDetails] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const loadDetails = async () => {
        if (!api || !item.Id) return;
        
        try {
            setLoading(true);
            const userId = localStorage.getItem('jellyfin_user_id');
            if (!userId) return;
            
            const itemDetails = await getItemDetails(api, item.Id, userId);
            setDetails(itemDetails);
        } catch (error) {
            console.error('Error loading item details:', error);
        } finally {
            setLoading(false);
        }
    };

    // Add preview image if available
    const hasImage = item.ImageTags?.Primary;
    const imageUrl = hasImage && api ? getImageUrl(api, item.Id, 'Primary') : null;
    const blurHash = item.ImageBlurHashes?.Primary;

    return (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                    {imageUrl && (
                        <div className="flex-shrink-0 w-16 h-24">
                            <img 
                                src={imageUrl}
                                alt={item.Name}
                                className="w-full h-full object-cover rounded"
                            />
                            {blurHash && typeof blurHash === 'string' && (
                                <div className="text-xs text-gray-400 mt-1 truncate" title={blurHash}>
                                    Blur: {blurHash.length > 10 ? `${blurHash.substring(0, 10)}...` : blurHash}
                                </div>
                            )}
                        </div>
                    )}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">{item.Name}</h3>
                        <p className="text-sm text-gray-500">{item.Type}</p>
                        {item.ImageTags && (
                            <p className="text-xs text-gray-400 mt-1">
                                Available Images: {Object.keys(item.ImageTags).join(', ')}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => {
                        if (!expanded && !details) {
                            loadDetails();
                        }
                        setExpanded(!expanded);
                    }}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                >
                    {loading ? 'Loading...' : expanded ? 'Collapse' : 'Expand'}
                </button>
            </div>

            {expanded && (
                <div className="mt-4 space-y-2">
                    {Object.entries(details || item).map(([key, value]) => (
                        <div key={key} className="group">
                            <div className="font-medium text-gray-700">{key}:</div>
                            <div className="mt-1">
                                <FieldValue 
                                    name={key} 
                                    value={value} 
                                    api={api} 
                                    itemId={item.Id}
                                    parentData={details || item}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function Debug() {
    const router = useRouter();
    const [api, setApi] = useState<any>(null);
    const [debugItems, setDebugItems] = useState<DebugItem[]>([]);
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
        const fetchDebugData = async () => {
            if (!api) return;

            try {
                setLoading(true);
                setError(null);
                const userId = localStorage.getItem('jellyfin_user_id');
                if (!userId) {
                    throw new JellyfinError('User ID not found');
                }

                // Fetch libraries
                const libraries = await getUserLibraries(api, userId);
                setDebugItems(prev => [...prev, {
                    type: 'Libraries',
                    name: 'User Libraries',
                    data: libraries
                }]);

                // Fetch latest media for each library
                for (const library of libraries) {
                    const media = await getLatestMedia(api, userId, library.Id);
                    setDebugItems(prev => [...prev, {
                        type: 'Latest Media',
                        name: `Latest from ${library.Name}`,
                        data: media
                    }]);
                }
            } catch (err) {
                console.error('Error fetching debug data:', err);
                if (err instanceof JellyfinError) {
                    setError(err.message);
                } else {
                    setError('Failed to load debug data');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDebugData();
    }, [api]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-xl text-gray-600">Loading debug data...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-red-600 bg-red-50 p-4 rounded-md">
                        <div className="font-medium">Error</div>
                        <div className="mt-1">{error}</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Debug View</h1>
                    <button
                        onClick={() => router.push('/')}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
                    >
                        Back to Home
                    </button>
                </div>

                {debugItems.map((debugItem, index) => (
                    <div key={index} className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{debugItem.name}</h2>
                        <div className="space-y-4">
                            {Array.isArray(debugItem.data) ? (
                                debugItem.data.map((item, i) => (
                                    <ItemDebug key={item.Id || i} item={item} api={api} />
                                ))
                            ) : (
                                <ItemDebug item={debugItem.data} api={api} />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
} 