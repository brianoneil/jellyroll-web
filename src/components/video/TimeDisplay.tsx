import React from 'react';

interface TimeDisplayProps {
    currentTime: number;
    duration: number;
}

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const TimeDisplay: React.FC<TimeDisplayProps> = ({
    currentTime,
    duration,
}) => {
    return (
        <div className="flex items-center space-x-2 w-[200px]">
            <span className="text-white text-sm font-mono">
                <span className="inline-block min-w-[80px] text-right">
                    {formatTime(currentTime)}
                </span>
                {' / '}
                <span className="inline-block min-w-[80px]">
                    {formatTime(duration)}
                </span>
            </span>
        </div>
    );
}; 