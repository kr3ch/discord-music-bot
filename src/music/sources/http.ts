import type { SearchResult, TrackInfo } from '../../types/track';

function filenameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = decodeURIComponent(u.pathname.split('/').pop() || 'Direct stream');
    return last || u.hostname;
  } catch {
    return 'Direct stream';
  }
}

export function resolveHttpUrl(
  url: string,
  requesterId: string,
  requesterTag: string,
): SearchResult {
  const track: TrackInfo = {
    title: filenameFromUrl(url),
    url,
    duration: 0,
    thumbnail: '',
    author: 'Direct stream',
    source: 'http',
    isLive: true,
    requestedBy: requesterId,
    requestedByTag: requesterTag,
  };
  return { tracks: [track] };
}

export function isAudioHttpUrl(url: string): boolean {
  return /^https?:\/\/.+\.(mp3|m4a|aac|ogg|opus|wav|flac|webm)(\?.*)?$/i.test(url);
}

export function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}
