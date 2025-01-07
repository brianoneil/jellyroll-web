import React from 'react';
import { JellyfinApi, getImageUrl, formatRuntime } from '../../utils/jellyfin';
import { BaseItemDto } from '../../types/jellyfin';

interface InfoOverlayProps {
    item: BaseItemDto;
    api: JellyfinApi;
}

export const InfoOverlay: React.FC<InfoOverlayProps> = ({
    item,
    api
}) => {
    return (
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
    );
}; 