import React, { useRef, useEffect, useCallback, useState } from 'react';
import { JellyfinApi, getLowestQualityStreamUrl } from '../../utils/jellyfin';
import { Chapter } from '../../types/jellyfin';

interface ProgressBarProps {
    currentTime: number;
    duration: number;
    chapters?: Chapter[];
    showChapterMarkers: boolean;
    onTimeUpdate: (time: number) => void;
    onPreviewTimeChange: (time: number | null) => void;
    onPreviewPositionChange: (position: number) => void;
    api: JellyfinApi;
    itemId: string;
    isPlaying: boolean;
    previewTime: number | null;
    previewPosition: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    currentTime,
    duration,
    chapters,
    showChapterMarkers,
    onTimeUpdate,
    onPreviewTimeChange,
    onPreviewPositionChange,
    api,
    itemId,
    isPlaying,
    previewTime,
    previewPosition
}) => {
    const progressRef = useRef<HTMLDivElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const previewVideoRef = useRef<HTMLVideoElement>(null);
    const previewCache = useRef<Map<number, string>>(new Map());
    const [containerWidth, setContainerWidth] = useState(0);
    const [isMoving, setIsMoving] = useState(false);
    const lastPositionRef = useRef<number | null>(null);
    const lastMoveTimeRef = useRef<number>(Date.now());
    const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const MOVEMENT_THRESHOLD = 5; // pixels
    const TIME_THRESHOLD = 200; // milliseconds

    useEffect(() => {
        const previewVideo = previewVideoRef.current;
        if (!previewVideo) return;

        // Set up preview video with lowest quality stream
        previewVideo.src = getLowestQualityStreamUrl(api, itemId);
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
    }, [api, itemId]);

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
        [api, itemId]
    );

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current) return;
        
        const rect = progressRef.current.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        onTimeUpdate(pos * duration);
    };

    const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current || isPlaying) return;
        
        const rect = progressRef.current.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const time = pos * duration;
        const newPosition = e.clientX - rect.left;
        const currentTime = Date.now();
        
        // Clear the current preview
        const canvas = previewCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        onPreviewTimeChange(time);
        onPreviewPositionChange(newPosition);
        debouncedSeek(time);

        // Check if we're at the boundaries
        const isAtBoundary = newPosition <= 160 || newPosition >= (containerWidth - 160);
        
        if (!isAtBoundary) {
            // Calculate movement distance and time
            const distance = lastPositionRef.current !== null ? Math.abs(newPosition - lastPositionRef.current) : 0;
            const timeSinceLastMove = currentTime - lastMoveTimeRef.current;
            
            // Clear any existing timeout
            if (moveTimeoutRef.current) {
                clearTimeout(moveTimeoutRef.current);
            }

            // If there's significant movement, hide preview and update last move time
            if (distance > MOVEMENT_THRESHOLD) {
                setIsMoving(true);
                lastMoveTimeRef.current = currentTime;
            }
            
            // Set timeout to show preview after pause
            moveTimeoutRef.current = setTimeout(() => {
                const currentDistance = lastPositionRef.current !== null ? 
                    Math.abs(newPosition - lastPositionRef.current) : 0;
                    
                // Only show if we haven't moved significantly recently
                if (currentDistance <= MOVEMENT_THRESHOLD) {
                    setIsMoving(false);
                }
            }, TIME_THRESHOLD);
        } else {
            setIsMoving(false);
        }

        // Update last position
        lastPositionRef.current = newPosition;
    };

    // Add resize observer to track container width
    useEffect(() => {
        if (!progressRef.current) return;
        
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });
        
        resizeObserver.observe(progressRef.current);
        
        return () => resizeObserver.disconnect();
    }, []);

    // Clean up timeout on unmount
    useEffect(() => {
        return () => {
            if (moveTimeoutRef.current) {
                clearTimeout(moveTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div className="mb-4">
            <div 
                ref={progressRef}
                className="relative h-1 bg-white/30 cursor-pointer"
                onClick={handleProgressClick}
                onMouseMove={!isPlaying ? handleProgressHover : undefined}
                onMouseLeave={() => {
                    onPreviewTimeChange(null);
                    setIsMoving(false);
                }}
            >
                {/* Progress */}
                <div 
                    className="absolute top-0 left-0 h-full bg-indigo-500"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                
                {/* Chapter Markers */}
                {showChapterMarkers && chapters?.map((chapter, index) => {
                    const position = (chapter.StartPositionTicks / (duration * 10000000)) * 100;
                    return (
                        <div
                            key={index}
                            className="absolute top-0 w-0.5 h-3 -mt-1 bg-white/60 hover:bg-white transition-colors z-10"
                            style={{ left: `${position}%` }}
                            title={chapter.Name}
                        />
                    );
                })}

                {/* Hidden preview video */}
                <video
                    ref={previewVideoRef}
                    className="hidden"
                    crossOrigin="anonymous"
                    preload="auto"
                    muted
                />

                {/* Preview thumbnail */}
                {!isPlaying && previewTime !== null && (
                    <div 
                        className={`absolute bg-black/60 backdrop-blur-sm rounded-lg overflow-visible`}
                        style={{ 
                            left: Math.min(
                                Math.max(160, previewPosition),
                                containerWidth - 160
                            ),
                            bottom: '16px',
                            transform: 'translateX(-50%)',
                            width: 'min(320px, 30vw)',
                            boxShadow: '0 0 10px 2px rgba(99, 102, 241, 0.3)',
                            zIndex: 20
                        }}
                    >
                        <div 
                            className="relative w-full transition-[height] duration-150 overflow-hidden"
                            style={{ 
                                height: isMoving ? '0' : '180px',
                                opacity: isMoving ? 0.5 : 1
                            }}
                        >
                            <canvas
                                ref={previewCanvasRef}
                                width="320"
                                height="180"
                                className="absolute inset-0 w-full h-full"
                            />
                        </div>
                        <div className="text-white text-sm px-3 py-2 text-center bg-black/60">
                            {formatTime(previewTime)}
                        </div>
                        {/* Triangle indicator */}
                        <div 
                            className="absolute left-1/2 -bottom-2 w-4 h-2 -translate-x-1/2"
                            style={{
                                borderLeft: '8px solid transparent',
                                borderRight: '8px solid transparent',
                                borderTop: '8px solid rgba(0, 0, 0, 0.6)',
                                filter: 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.3))',
                                zIndex: 21
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper function to format time
const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}; 