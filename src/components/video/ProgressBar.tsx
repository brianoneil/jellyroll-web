import React, { useRef, useEffect, useCallback } from 'react';
import { JellyfinApi, getLowestQualityStreamUrl } from '../../utils/jellyfin';
import { Chapter } from '../../types/jellyfin';

interface ProgressBarProps {
    currentTime: number;
    duration: number;
    chapters?: Chapter[];
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
        
        // Clear the current preview
        const canvas = previewCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        onPreviewTimeChange(time);
        onPreviewPositionChange(e.clientX - rect.left);
        debouncedSeek(time);
    };

    return (
        <div className="mb-4">
            <div 
                ref={progressRef}
                className="relative h-1 bg-white/30 cursor-pointer"
                onClick={handleProgressClick}
                onMouseMove={!isPlaying ? handleProgressHover : undefined}
                onMouseLeave={() => onPreviewTimeChange(null)}
            >
                {/* Progress */}
                <div 
                    className="absolute top-0 left-0 h-full bg-indigo-500"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                
                {/* Chapter Markers */}
                {chapters?.map((chapter, index) => {
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