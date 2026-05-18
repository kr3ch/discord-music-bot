import { resolveYouTubeUrl } from './youtube';
import type { SearchResult } from '../../types/track';

// yt-dlp natively supports SoundCloud URLs, so we reuse the same flow but tag the source.
export async function resolveSoundCloudUrl(
  url: string,
  requesterId: string,
  requesterTag: string,
): Promise<SearchResult> {
  const result = await resolveYouTubeUrl(url, requesterId, requesterTag);
  return {
    ...result,
    tracks: result.tracks.map((t) => ({ ...t, source: 'soundcloud' })),
  };
}

export function isSoundCloudUrl(url: string): boolean {
  return /(?:^|\W)(?:on\.)?soundcloud\.com\//i.test(url);
}
