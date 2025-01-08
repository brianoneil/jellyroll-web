import { saveDebugData } from './debug';

export class JellyfinError extends Error {
    constructor(message: string, public statusCode?: number) {
        super(message);
        this.name = 'JellyfinError';
    }
}

export interface JellyfinApi {
    baseUrl: string;
    accessToken?: string;
}

export const createApi = (serverUrl: string): JellyfinApi => {
    return {
        baseUrl: serverUrl.replace(/\/$/, ''), // Remove trailing slash if present
    };
};

export const authenticateUser = async (api: JellyfinApi, username: string, password: string) => {
    try {
        const response = await fetch(`${api.baseUrl}/Users/AuthenticateByName`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Emby-Authorization': `MediaBrowser Client="Jellyroll Web", Device="Browser", DeviceId="jellyroll-web", Version="1.0.0"`,
            },
            body: JSON.stringify({ Username: username, Pw: password }),
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new JellyfinError('Invalid username or password', 401);
            }
            throw new JellyfinError(`Server error: ${response.statusText}`, response.status);
        }

        const data = await response.json();
        if (!data.AccessToken) {
            throw new JellyfinError('Invalid response from server');
        }

        api.accessToken = data.AccessToken;
        return data;
    } catch (error: any) {
        if (error instanceof JellyfinError) {
            throw error;
        }
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            throw new JellyfinError('Could not connect to server. Please check the server URL');
        }
        console.error('Authentication error:', error);
        throw new JellyfinError('Failed to authenticate with Jellyfin server');
    }
};

export const getUserLibraries = async (api: JellyfinApi, userId: string) => {
    try {
        const response = await fetch(`${api.baseUrl}/Users/${userId}/Views`, {
            headers: {
                'X-MediaBrowser-Token': api.accessToken || '',
            },
        });

        if (!response.ok) {
            throw new JellyfinError(`Failed to fetch libraries: ${response.statusText}`, response.status);
        }

        const data = await response.json();
        if (!data.Items) {
            throw new JellyfinError('No libraries found');
        }

        // Save debug data
        await saveDebugData('libraries', data.Items);

        return data.Items;
    } catch (error: any) {
        console.error('Error fetching libraries:', error);
        if (error instanceof JellyfinError) {
            throw error;
        }
        throw new JellyfinError('Failed to fetch libraries');
    }
};

export const getLatestMedia = async (api: JellyfinApi, userId: string, parentId: string) => {
    try {
        const params = new URLSearchParams({
            userId,
            parentId,
            limit: '12',
            recursive: 'true',
            sortBy: 'DateCreated,SortName',
            sortOrder: 'Descending',
            fields: 'PrimaryImageAspectRatio,BasicSyncInfo',
            imageTypeLimit: '1',
            enableImageTypes: 'Primary,Backdrop,Thumb'
        });

        const response = await fetch(`${api.baseUrl}/Users/${userId}/Items?${params}`, {
            headers: {
                'X-MediaBrowser-Token': api.accessToken || '',
            },
        });

        if (!response.ok) {
            throw new JellyfinError(`Failed to fetch media: ${response.statusText}`, response.status);
        }

        const data = await response.json();
        
        // Save debug data
        await saveDebugData(`latest_media_${parentId}`, data.Items || []);

        return data.Items || [];
    } catch (error: any) {
        console.error('Error fetching latest media:', error);
        if (error instanceof JellyfinError) {
            throw error;
        }
        throw new JellyfinError('Failed to fetch latest media');
    }
};

export const getImageUrl = (api: JellyfinApi, itemId: string, imageType: 'Primary' | 'Backdrop' | 'Thumb' = 'Primary') => {
    return `${api.baseUrl}/Items/${itemId}/Images/${imageType}?api_key=${api.accessToken}`;
};

export const getStreamUrl = (api: JellyfinApi, itemId: string) => {
    const params = new URLSearchParams({
        static: 'true',
        mediaSourceId: itemId,
        api_key: api.accessToken || ''
    });
    return `${api.baseUrl}/Videos/${itemId}/stream.mp4?${params}`;
};

export const getItemDetails = async (api: JellyfinApi, itemId: string, userId: string) => {
    try {
        const params = new URLSearchParams({
            userId,
            fields: [
                'Overview',
                'Genres',
                'Studios',
                'ProductionYear',
                'DateCreated',
                'RunTimeTicks',
                'MediaStreams',
                'MediaSources',
                'Chapters',
                'People',
                'ProviderIds'
            ].join(',')
        });

        const response = await fetch(`${api.baseUrl}/Users/${userId}/Items/${itemId}?${params}`, {
            headers: {
                'X-MediaBrowser-Token': api.accessToken || '',
            },
        });

        if (!response.ok) {
            throw new JellyfinError(`Failed to fetch item details: ${response.statusText}`, response.status);
        }

        const data = await response.json();
        
        // Save debug data
        await saveDebugData(`item_details_${itemId}`, data);

        return data;
    } catch (error: any) {
        console.error('Error fetching item details:', error);
        if (error instanceof JellyfinError) {
            throw error;
        }
        throw new JellyfinError('Failed to fetch item details');
    }
};

export const getSeasons = async (api: JellyfinApi, showId: string, userId: string) => {
    try {
        const params = new URLSearchParams({
            userId,
            fields: 'Overview,ProductionYear,DateCreated',
            sortBy: 'SortName',
            sortOrder: 'Ascending'
        });

        const response = await fetch(`${api.baseUrl}/Shows/${showId}/Seasons?${params}`, {
            headers: {
                'X-MediaBrowser-Token': api.accessToken || '',
            },
        });

        if (!response.ok) {
            throw new JellyfinError(`Failed to fetch seasons: ${response.statusText}`, response.status);
        }

        const data = await response.json();
        
        // Save debug data
        await saveDebugData(`seasons_${showId}`, data.Items || []);

        return data.Items || [];
    } catch (error: any) {
        console.error('Error fetching seasons:', error);
        if (error instanceof JellyfinError) {
            throw error;
        }
        throw new JellyfinError('Failed to fetch seasons');
    }
};

export const getEpisodes = async (api: JellyfinApi, seasonId: string, userId: string) => {
    try {
        const params = new URLSearchParams({
            userId,
            seasonId,
            fields: 'Overview,ProductionYear,DateCreated,MediaSources',
            sortBy: 'SortName',
            sortOrder: 'Ascending'
        });

        const response = await fetch(`${api.baseUrl}/Shows/${seasonId}/Episodes?${params}`, {
            headers: {
                'X-MediaBrowser-Token': api.accessToken || '',
            },
        });

        if (!response.ok) {
            throw new JellyfinError(`Failed to fetch episodes: ${response.statusText}`, response.status);
        }

        const data = await response.json();
        
        // Save debug data
        await saveDebugData(`episodes_${seasonId}`, data.Items || []);

        return data.Items || [];
    } catch (error: any) {
        console.error('Error fetching episodes:', error);
        if (error instanceof JellyfinError) {
            throw error;
        }
        throw new JellyfinError('Failed to fetch episodes');
    }
};

export const getLowestQualityStreamUrl = (api: JellyfinApi, itemId: string) => {
    const params = new URLSearchParams({
        static: 'true',
        mediaSourceId: itemId,
        api_key: api.accessToken || '',
        maxWidth: '160',
        maxHeight: '90',
        quality: '5'
    });
    return `${api.baseUrl}/Videos/${itemId}/stream.mp4?${params}`;
};

export const getAllLibraryItems = async (api: JellyfinApi, userId: string, parentId: string) => {
    try {
        const params = new URLSearchParams({
            userId,
            parentId,
            recursive: 'true',
            sortBy: 'SortName',
            sortOrder: 'Ascending',
            fields: 'PrimaryImageAspectRatio,BasicSyncInfo',
            imageTypeLimit: '1',
            enableImageTypes: 'Primary,Backdrop,Thumb',
            limit: '1000'  // Set a high limit to get all items
        });

        const response = await fetch(`${api.baseUrl}/Users/${userId}/Items?${params}`, {
            headers: {
                'X-MediaBrowser-Token': api.accessToken || '',
            },
        });

        if (!response.ok) {
            throw new JellyfinError(`Failed to fetch media: ${response.statusText}`, response.status);
        }

        const data = await response.json();
        
        // Save debug data
        await saveDebugData(`library_items_${parentId}`, data.Items || []);

        return data.Items || [];
    } catch (error: any) {
        console.error('Error fetching library items:', error);
        if (error instanceof JellyfinError) {
            throw error;
        }
        throw new JellyfinError('Failed to fetch library items');
    }
};

// Helper function to format runtime
export const formatRuntime = (runtimeTicks: number) => {
    const seconds = Math.floor(runtimeTicks / 10000000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}; 