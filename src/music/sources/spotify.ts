import { env } from '../../config/env';
import { createChildLogger } from '../../utils/logger';
import { SourceError } from '../../utils/errors';
import type { TrackInfo, SearchResult } from '../../types/track';
import { searchYouTube } from './youtube';

const log = createChildLogger('source:spotify');

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getSpotifyToken(): Promise<string> {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
    throw new SourceError(
      'Spotify is not configured',
      'Spotify support requires `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in `.env`.',
    );
  }
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const creds = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString(
    'base64',
  );
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new SourceError(`Spotify auth failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return data.access_token;
}

interface SpotifyTrack {
  name: string;
  artists: { name: string }[];
  duration_ms: number;
  external_urls: { spotify: string };
  album?: { images: { url: string }[] };
}

interface SpotifyPlaylist {
  name: string;
  external_urls: { spotify: string };
  tracks: {
    items: { track: SpotifyTrack | null }[];
    next?: string | null;
  };
}

interface SpotifyAlbum {
  name: string;
  external_urls: { spotify: string };
  images: { url: string }[];
  tracks: {
    items: SpotifyTrack[];
    next?: string | null;
  };
}

async function spotifyFetch<T>(url: string): Promise<T> {
  const token = await getSpotifyToken();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new SourceError(`Spotify API ${res.status}: ${await res.text().catch(() => '')}`);
  }
  return (await res.json()) as T;
}

function parseSpotifyUrl(url: string): { type: 'track' | 'playlist' | 'album'; id: string } | null {
  const m = url.match(/spotify\.com\/(?:intl-[a-z]+\/)?(track|playlist|album)\/([a-zA-Z0-9]+)/);
  if (!m) return null;
  return { type: m[1] as 'track' | 'playlist' | 'album', id: m[2] };
}

async function spotifyTrackToInfo(
  track: SpotifyTrack,
  requesterId: string,
  requesterTag: string,
): Promise<TrackInfo | null> {
  const query = `${track.name} ${track.artists.map((a) => a.name).join(' ')}`;
  const results = await searchYouTube(query, requesterId, requesterTag, 1);
  if (results.length === 0) return null;
  // Override with spotify metadata for cleaner display
  return {
    ...results[0],
    title: track.name,
    author: track.artists.map((a) => a.name).join(', '),
    duration: Math.floor(track.duration_ms / 1000),
    thumbnail: track.album?.images?.[0]?.url || results[0].thumbnail,
    source: 'spotify',
  };
}

export async function resolveSpotifyUrl(
  url: string,
  requesterId: string,
  requesterTag: string,
): Promise<SearchResult> {
  const parsed = parseSpotifyUrl(url);
  if (!parsed) throw new SourceError('Invalid Spotify URL');

  if (parsed.type === 'track') {
    const track = await spotifyFetch<SpotifyTrack>(
      `https://api.spotify.com/v1/tracks/${parsed.id}`,
    );
    const info = await spotifyTrackToInfo(track, requesterId, requesterTag);
    return { tracks: info ? [info] : [] };
  }

  if (parsed.type === 'playlist') {
    const playlist = await spotifyFetch<SpotifyPlaylist>(
      `https://api.spotify.com/v1/playlists/${parsed.id}?limit=100`,
    );
    const items: SpotifyTrack[] = playlist.tracks.items
      .map((i) => i.track)
      .filter((t): t is SpotifyTrack => Boolean(t));

    let next = playlist.tracks.next;
    while (next && items.length < 500) {
      const page = await spotifyFetch<SpotifyPlaylist['tracks']>(next);
      for (const i of page.items) if (i.track) items.push(i.track);
      next = page.next || null;
    }

    const tracks: TrackInfo[] = [];
    for (const t of items) {
      try {
        const info = await spotifyTrackToInfo(t, requesterId, requesterTag);
        if (info) tracks.push(info);
      } catch (err) {
        log.warn({ err, track: t.name }, 'Failed to resolve spotify track');
      }
    }

    return {
      tracks,
      playlist: {
        title: playlist.name,
        url: playlist.external_urls.spotify,
        trackCount: tracks.length,
      },
    };
  }

  // album
  const album = await spotifyFetch<SpotifyAlbum>(`https://api.spotify.com/v1/albums/${parsed.id}`);
  const items: SpotifyTrack[] = [...album.tracks.items];
  let next = album.tracks.next;
  while (next && items.length < 500) {
    const page = await spotifyFetch<SpotifyAlbum['tracks']>(next);
    items.push(...page.items);
    next = page.next || null;
  }

  const tracks: TrackInfo[] = [];
  for (const t of items) {
    try {
      // album endpoint doesn't include album.images, add it back
      const enriched: SpotifyTrack = { ...t, album: { images: album.images } };
      const info = await spotifyTrackToInfo(enriched, requesterId, requesterTag);
      if (info) tracks.push(info);
    } catch (err) {
      log.warn({ err, track: t.name }, 'Failed to resolve spotify track');
    }
  }

  return {
    tracks,
    playlist: {
      title: album.name,
      url: album.external_urls.spotify,
      trackCount: tracks.length,
    },
  };
}

export function isSpotifyUrl(url: string): boolean {
  return /(open\.)?spotify\.com\/(?:intl-[a-z]+\/)?(track|playlist|album)\//.test(url);
}
