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

export interface BaseItemDto {
    Id: string;
    Name: string;
    Type?: string;
    ImageTags?: ImageTags;
    ImageBlurHashes?: {
        Primary?: string;
    };
    ProductionYear?: number;
    RunTimeTicks?: number;
    Overview?: string;
    Genres?: string[];
    OfficialRating?: string;
    Chapters?: Chapter[];
    ProviderIds?: ProviderIds;
}

export interface Person {
    Id: string;
    Name: string;
    Role?: string;
    Type?: string;
    PrimaryImageTag?: string;
    ImageBlurHashes?: {
        Primary?: string;
    };
    ProviderIds?: ProviderIds;
} 