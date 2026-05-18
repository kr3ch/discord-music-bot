import { createChildLogger } from '../../utils/logger';
import { SourceError } from '../../utils/errors';
import type { SearchResult } from '../../types/track';
import { resolveYouTubeUrl, searchYouTube } from './youtube';
import { isSpotifyUrl, resolveSpotifyUrl } from './spotify';
import { isSoundCloudUrl, resolveSoundCloudUrl } from './soundcloud';
import { isAudioHttpUrl, isHttpUrl, resolveHttpUrl } from './http';

const log = createChildLogger('source:resolver');

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)\//i.test(url);
}

export async function resolveQuery(
  query: string,
  requesterId: string,
  requesterTag: string,
): Promise<SearchResult> {
  const trimmed = query.trim();
  if (!trimmed) throw new SourceError('Empty query');

  log.debug({ query: trimmed }, 'Resolving query');

  if (isSpotifyUrl(trimmed)) {
    return resolveSpotifyUrl(trimmed, requesterId, requesterTag);
  }

  if (isSoundCloudUrl(trimmed)) {
    return resolveSoundCloudUrl(trimmed, requesterId, requesterTag);
  }

  if (isYouTubeUrl(trimmed)) {
    return resolveYouTubeUrl(trimmed, requesterId, requesterTag);
  }

  if (isHttpUrl(trimmed)) {
    if (isAudioHttpUrl(trimmed)) {
      return resolveHttpUrl(trimmed, requesterId, requesterTag);
    }
    // Unknown HTTP URL — try yt-dlp anyway (works for many sites)
    try {
      return await resolveYouTubeUrl(trimmed, requesterId, requesterTag);
    } catch {
      // Fall back to treating it as a raw stream
      return resolveHttpUrl(trimmed, requesterId, requesterTag);
    }
  }

  // Plain text query → YouTube search (single best result)
  const results = await searchYouTube(trimmed, requesterId, requesterTag, 1);
  return { tracks: results };
}

export async function smartSearch(
  query: string,
  requesterId: string,
  requesterTag: string,
  limit = 5,
) {
  return searchYouTube(query, requesterId, requesterTag, limit);
}
