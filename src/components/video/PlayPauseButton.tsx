import React from 'react';

interface PlayPauseButtonProps {
    isPlaying: boolean;
    onToggle: () => void;
}

export const PlayPauseButton: React.FC<PlayPauseButtonProps> = ({
    isPlaying,
    onToggle
}) => {
    return (
        <button 
            onClick={onToggle}
            className="text-white hover:text-indigo-400 transition-colors"
        >
            {isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
            ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            )}
        </button>
    );
}; 