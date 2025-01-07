import React, { useRef, useState } from 'react';
import { JellyfinApi } from '../../utils/jellyfin';
import { Chapter } from '../../types/jellyfin';
import { ProgressBar } from './ProgressBar';
import { TimeDisplay } from './TimeDisplay';
import { VolumeControl } from './VolumeControl';
import { PlayPauseButton } from './PlayPauseButton';
import { FullscreenButton } from './FullscreenButton';
import { CaptionControl } from './CaptionControl';

interface VideoControlsProps {
    isVisible: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isPlaying: boolean;
    isFullscreen: boolean;
    chapters?: Chapter[];
    showChapterMarkers: boolean;
    showCaptions: boolean;
    availableTracks: TextTrack[];
    selectedTrack: string;
    onTimeUpdate: (time: number) => void;
    onVolumeChange: (volume: number) => void;
    onVolumeMuteToggle: () => void;
    onTogglePlay: () => void;
    onToggleFullscreen: () => void;
    onToggleChapterMarkers: () => void;
    onCaptionToggle: () => void;
    onTrackSelect: (trackLabel: string) => void;
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
    showChapterMarkers,
    showCaptions,
    availableTracks,
    selectedTrack,
    onTimeUpdate,
    onVolumeChange,
    onVolumeMuteToggle,
    onTogglePlay,
    onToggleFullscreen,
    onToggleChapterMarkers,
    onCaptionToggle,
    onTrackSelect,
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
                showChapterMarkers={showChapterMarkers}
                onTimeUpdate={onTimeUpdate}
                onPreviewTimeChange={setPreviewTime}
                onPreviewPositionChange={setPreviewPosition}
                api={api}
                itemId={itemId}
                isPlaying={isPlaying}
                previewTime={previewTime}
                previewPosition={previewPosition}
            />

            <div className="flex items-center justify-between">
                {/* Left side - Playback controls */}
                <div className="flex items-center space-x-4">
                    <PlayPauseButton
                        isPlaying={isPlaying}
                        onToggle={onTogglePlay}
                    />

                    <TimeDisplay
                        currentTime={currentTime}
                        duration={duration}
                    />
                </div>

                {/* Right side - Utility controls */}
                <div className="flex items-center space-x-4">
                    <VolumeControl
                        volume={volume}
                        onChange={onVolumeChange}
                        onMuteToggle={onVolumeMuteToggle}
                    />

                    <CaptionControl
                        showCaptions={showCaptions}
                        availableTracks={availableTracks}
                        selectedTrack={selectedTrack}
                        onCaptionToggle={onCaptionToggle}
                        onTrackSelect={onTrackSelect}
                    />

                    {chapters && chapters.length > 0 && (
                        <button
                            onClick={onToggleChapterMarkers}
                            className="text-white hover:text-indigo-400 transition-colors"
                            title={showChapterMarkers ? "Hide Chapter Markers" : "Show Chapter Markers"}
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
                                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                                />
                                {!showChapterMarkers && (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 3l18 18"
                                    />
                                )}
                            </svg>
                        </button>
                    )}

                    <FullscreenButton
                        isFullscreen={isFullscreen}
                        onToggle={onToggleFullscreen}
                    />
                </div>
            </div>
        </div>
    );
}; 