import React from 'react';

interface FullscreenButtonProps {
    isFullscreen: boolean;
    onToggle: () => void;
}

export const FullscreenButton: React.FC<FullscreenButtonProps> = ({
    isFullscreen,
    onToggle
}) => {
    return (
        <button
            onClick={onToggle}
            className="text-white hover:text-indigo-400 transition-colors"
        >
            {isFullscreen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M9 20H5a2 2 0 01-2-2v-4m14-4v4a2 2 0 01-2 2h-4m0-16h4a2 2 0 012 2v4M5 5a2 2 0 012-2h4"
                    />
                </svg>
            ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2}
                        d="M15 3h6m0 0v6m0-6L14 10M9 21H3m0 0v-6m0 6l7-7"
                    />
                </svg>
            )}
        </button>
    );
}; 