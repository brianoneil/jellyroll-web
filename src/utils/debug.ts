const DEBUG = process.env.NEXT_PUBLIC_DEBUG === 'true';

export const saveDebugData = async (filename: string, data: any) => {
    if (!DEBUG) return;

    try {
        // In client-side, just log to console
        console.log(`Debug data for ${filename}:`, data);
        
        // Store in localStorage for persistence
        try {
            localStorage.setItem(`debug_${filename}`, JSON.stringify(data));
            console.log(`Debug data saved to localStorage: debug_${filename}`);
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }
    } catch (error) {
        console.error('Error saving debug data:', error);
    }
};

export const getDebugData = (filename: string) => {
    if (!DEBUG) return null;

    try {
        const data = localStorage.getItem(`debug_${filename}`);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Error reading debug data:', e);
        return null;
    }
};

export const isDebugMode = () => DEBUG; 