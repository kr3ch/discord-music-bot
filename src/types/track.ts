export type TrackSource = 'youtube' | 'spotify' | 'soundcloud' | 'http' | 'unknown';

export interface TrackInfo {
  title: string;
  url: string;
  duration: number; // seconds, 0 = livestream
  thumbnail: string;
  author: string;
  source: TrackSource;
  isLive: boolean;
  requestedBy: string; // user id
  requestedByTag: string; // user tag
}

export interface SearchResult {
  tracks: TrackInfo[];
  playlist?: {
    title: string;
    url: string;
    trackCount: number;
  };
}

export enum LoopMode {
  Off = 0,
  Track = 1,
  Queue = 2,
}
