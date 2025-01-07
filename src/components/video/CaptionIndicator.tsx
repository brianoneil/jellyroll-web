import React from 'react';
import { MediaStream } from '../../types/jellyfin';

interface CaptionIndicatorProps {
    mediaStreams?: MediaStream[];
}

export const CaptionIndicator: React.FC<CaptionIndicatorProps> = ({ mediaStreams }) => {
    const hasCaptions = mediaStreams?.some(stream => 
        stream.Type === 'Subtitle'
    );

    if (!hasCaptions) return null;

    return (
        <div 
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-black/40 rounded text-white text-sm"
            title="Closed Captions Available"
        >
            <svg 
                className="w-4 h-4" 
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                <path d="M18 20H4V6h16v10h2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14v-2zM6 12h2v2H6v-2zm12 0h-6v2h6v-2zm-8-4h8v2h-8V8zM6 8h2v2H6V8z" />
            </svg>
            <span>CC</span>
        </div>
    );
}; 