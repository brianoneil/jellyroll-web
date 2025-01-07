export interface MediaStream {
    Type: string;
    IsExternal: boolean;
    DeliveryUrl?: string;
    DisplayTitle?: string;
    Language?: string;
    Index: number;
    Codec?: string;
    CodecTag?: string;
    TimeBase?: string;
    Title?: string;
}

export interface Chapter {
    StartPositionTicks: number;
    Name?: string;
}

export interface ImageTags {
    Primary?: string;
    Logo?: string;
}

export interface ProviderIds {
    Imdb?: string;
}

export interface MediaSource {
    Id: string;
    Name?: string;
    Path?: string;
    MediaStreams?: MediaStream[];
}

export interface BaseItemDto {
    Id: string;
    Name: string;
    Type: string;
    ImageTags?: ImageTags;
    ImageBlurHashes?: Record<string, Record<string, string>>;
    ProductionYear?: number;
    RunTimeTicks?: number;
    Overview?: string;
    Genres?: string[];
    OfficialRating?: string;
    Chapters?: Chapter[];
    ProviderIds?: ProviderIds;
    MediaStreams?: MediaStream[];
    MediaSources?: MediaSource[];
}

export interface Person {
    Id: string;
    Name: string;
    Role?: string;
    Type: string;
    PrimaryImageTag?: string;
    ImageBlurHashes?: Record<string, Record<string, string>>;
    ProviderIds?: ProviderIds;
}

export interface JellyfinApi {
    basePath: string;
    // ... other API methods ...
} 