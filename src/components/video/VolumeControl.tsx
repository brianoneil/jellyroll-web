import React from 'react';

interface VolumeControlProps {
    volume: number;
    onChange: (volume: number) => void;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({
    volume,
    onChange
}) => {
    return (
        <div className="flex items-center space-x-2">
            <svg 
                className="w-6 h-6 text-white" 
                fill="currentColor" 
                viewBox="0 0 24 24"
            >
                {volume === 0 ? (
                    <path d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H3v6h4l5 5v-6.71l4.84 4.84a.996.996 0 101.41-1.41l-15-15a.996.996 0 00-1.41 0zM12 4L9.91 6.09 12 8.18V4zm0 15.91V14.9l-2.09 2.09L12 19.91z"/>
                ) : volume < 0.5 ? (
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                ) : (
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                )}
            </svg>
            <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-24 accent-indigo-500"
            />
        </div>
    );
}; 