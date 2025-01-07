import React, { useRef, useState } from 'react';
import { JellyfinApi } from '../../utils/jellyfin';
import { Chapter } from '../../types/jellyfin';
import { ProgressBar } from './ProgressBar';
import { TimeDisplay } from './TimeDisplay';
import { VolumeControl } from './VolumeControl';
import { PlayPauseButton } from './PlayPauseButton';
import { FullscreenButton } from './FullscreenButton';

interface VideoControlsProps {
    isVisible: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isPlaying: boolean;
    isFullscreen: boolean;
    chapters?: Chapter[];
    onTimeUpdate: (time: number) => void;
    onVolumeChange: (volume: number) => void;
    onTogglePlay: () => void;
    onToggleFullscreen: () => void;
    api: JellyfinApi;
    itemId: string;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
    isVisible,
    currentTime,
    duration,
    volume,
    isPlaying,
    isFullscreen,
    chapters,
    onTimeUpdate,
    onVolumeChange,
    onTogglePlay,
    onToggleFullscreen,
    api,
    itemId
}) => {
    const [previewTime, setPreviewTime] = useState<number | null>(null);
    const [previewPosition, setPreviewPosition] = useState(0);

    return (
        <div 
            className={`video-controls absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-4 py-6 transition-opacity duration-200 ${
                isVisible ? 'opacity-100' : 'opacity-0'
            }`}
        >
            <ProgressBar
                currentTime={currentTime}
                duration={duration}
                chapters={chapters}
                onTimeUpdate={onTimeUpdate}
                onPreviewTimeChange={setPreviewTime}
                onPreviewPositionChange={setPreviewPosition}
                api={api}
                itemId={itemId}
                isPlaying={isPlaying}
                previewTime={previewTime}
                previewPosition={previewPosition}
            />

            <div className="flex items-center space-x-4">
                <PlayPauseButton
                    isPlaying={isPlaying}
                    onToggle={onTogglePlay}
                />

                <TimeDisplay
                    currentTime={currentTime}
                    duration={duration}
                />

                <VolumeControl
                    volume={volume}
                    onChange={onVolumeChange}
                />

                <div className="flex items-center space-x-4 ml-auto">
                    <FullscreenButton
                        isFullscreen={isFullscreen}
                        onToggle={onToggleFullscreen}
                    />
                </div>
            </div>
        </div>
    );
}; 