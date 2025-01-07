import React, { useState, useRef, useEffect } from 'react';

interface CaptionControlProps {
    showCaptions: boolean;
    availableTracks: TextTrack[];
    selectedTrack: string;
    onCaptionToggle: () => void;
    onTrackSelect: (trackLabel: string) => void;
}

export const CaptionControl: React.FC<CaptionControlProps> = ({
    showCaptions,
    availableTracks,
    selectedTrack,
    onCaptionToggle,
    onTrackSelect
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={onCaptionToggle}
                className={`text-white hover:text-indigo-400 transition-colors ${showCaptions ? 'text-indigo-400' : ''}`}
                title={showCaptions ? "Turn Captions Off" : "Turn Captions On"}
            >
                <svg 
                    className="w-6 h-6" 
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M18 20H4V6h16v10h2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14v-2zM6 12h2v2H6v-2zm12 0h-6v2h6v-2zm-8-4h8v2h-8V8zM6 8h2v2H6V8z" />
                    {!showCaptions && (
                        <path d="M3 3l18 18" strokeWidth={2} stroke="currentColor" strokeLinecap="round" />
                    )}
                </svg>
            </button>

            {availableTracks.length > 0 && (
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="ml-1 text-white hover:text-indigo-400 transition-colors"
                    title="Select Caption Track"
                >
                    <svg 
                        className="w-4 h-4" 
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
            )}

            {isMenuOpen && availableTracks.length > 0 && (
                <div className="absolute bottom-full mb-2 right-0 bg-black/90 backdrop-blur-sm rounded-lg overflow-hidden shadow-lg">
                    <div className="py-1">
                        {availableTracks.map((track, index) => (
                            <button
                                key={index}
                                className={`block w-full px-4 py-2 text-sm text-left whitespace-nowrap hover:bg-white/10 ${
                                    track.label === selectedTrack ? 'text-indigo-400' : 'text-white'
                                }`}
                                onClick={() => {
                                    onTrackSelect(track.label);
                                    setIsMenuOpen(false);
                                }}
                            >
                                {track.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}; 