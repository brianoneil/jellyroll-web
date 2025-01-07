import React, { useRef, useState, useEffect } from 'react';
import { JellyfinApi, getStreamUrl, getLowestQualityStreamUrl } from '../../utils/jellyfin';
import { VideoControls } from './VideoControls';
import { LoadingOverlay } from './LoadingOverlay';
import { InfoOverlay } from './InfoOverlay';
import { Chapter, BaseItemDto } from '../../types/jellyfin';

interface VideoPlayerProps {
    item: BaseItemDto;
    api: JellyfinApi;
    onClose: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ item, api, onClose }) => {
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
    const containerRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const handleVolumeChange = (newVolume: number) => {
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

    const handleTimeUpdate = (newTime: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
        }
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

                {(isLoading || isSeeking) && <LoadingOverlay />}
                
                {!isVideoPlaying && (
                    <InfoOverlay item={item} api={api} />
                )}

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

                <VideoControls
                    isVisible={isControlsVisible}
                    currentTime={currentTime}
                    duration={duration}
                    volume={volume}
                    isPlaying={isVideoPlaying}
                    isFullscreen={isFullscreen}
                    chapters={item.Chapters}
                    onTimeUpdate={handleTimeUpdate}
                    onVolumeChange={handleVolumeChange}
                    onTogglePlay={togglePlay}
                    onToggleFullscreen={toggleFullscreen}
                    api={api}
                    itemId={item.Id}
                />
            </div>
        </div>
    );
}; 