import { spawn } from 'node:child_process';
import { env } from '../../config/env';
import { createChildLogger } from '../../utils/logger';
import { SourceError } from '../../utils/errors';
import type { TrackInfo, SearchResult } from '../../types/track';

const log = createChildLogger('source:youtube');

const YTDLP = env.YTDLP_PATH || 'yt-dlp';

interface YtdlpEntry {
  id?: string;
  title?: string;
  url?: string;
  webpage_url?: string;
  duration?: number;
  thumbnail?: string;
  thumbnails?: { url: string }[];
  uploader?: string;
  channel?: string;
  is_live?: boolean;
  live_status?: string;
  _type?: string;
  entries?: YtdlpEntry[];
}

async function runYtdlp(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(YTDLP, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        log.warn({ code, stderr: stderr.slice(0, 500) }, 'yt-dlp exited non-zero');
        reject(new SourceError(`yt-dlp failed with code ${code}: ${stderr.slice(0, 200)}`));
        return;
      }
      resolve(stdout);
    });
  });
}

function entryToTrack(
  entry: YtdlpEntry,
  requesterId: string,
  requesterTag: string,
  source: TrackInfo['source'] = 'youtube',
): TrackInfo {
  const thumb =
    entry.thumbnail ||
    entry.thumbnails?.[entry.thumbnails.length - 1]?.url ||
    (entry.id ? `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg` : '');
  const isLive = entry.is_live === true || entry.live_status === 'is_live';
  return {
    title: entry.title || 'Unknown title',
    url: entry.webpage_url || entry.url || '',
    duration: isLive ? 0 : Math.floor(entry.duration || 0),
    thumbnail: thumb,
    author: entry.uploader || entry.channel || 'Unknown',
    source,
    isLive,
    requestedBy: requesterId,
    requestedByTag: requesterTag,
  };
}

export async function resolveYouTubeUrl(
  url: string,
  requesterId: string,
  requesterTag: string,
): Promise<SearchResult> {
  const args = [
    '--no-warnings',
    '--no-playlist',
    '--flat-playlist',
    '--dump-single-json',
    '--default-search',
    'ytsearch',
    url,
  ];

  // If it's a playlist URL, allow playlist parsing
  if (/[?&]list=/.test(url) && !/[?&]index=/.test(url)) {
    const idx = args.indexOf('--no-playlist');
    if (idx >= 0) args.splice(idx, 1);
  }

  const json = await runYtdlp(args);
  const data: YtdlpEntry = JSON.parse(json);

  if (data._type === 'playlist' && Array.isArray(data.entries)) {
    const tracks = data.entries
      .filter((e) => e && (e.url || e.webpage_url || e.id))
      .map((e) => {
        // Flat playlist entries don't have webpage_url, build it
        const url =
          e.webpage_url || (e.id ? `https://www.youtube.com/watch?v=${e.id}` : e.url || '');
        return entryToTrack({ ...e, webpage_url: url }, requesterId, requesterTag);
      });
    return {
      tracks,
      playlist: {
        title: data.title || 'YouTube Playlist',
        url: data.webpage_url || url,
        trackCount: tracks.length,
      },
    };
  }

  return { tracks: [entryToTrack(data, requesterId, requesterTag)] };
}

export async function searchYouTube(
  query: string,
  requesterId: string,
  requesterTag: string,
  limit = 5,
): Promise<TrackInfo[]> {
  const args = [
    '--no-warnings',
    '--flat-playlist',
    '--dump-single-json',
    `ytsearch${limit}:${query}`,
  ];
  try {
    const json = await runYtdlp(args);
    const data: YtdlpEntry = JSON.parse(json);
    if (!data.entries) return [];
    return data.entries.map((e) => {
      const url = e.webpage_url || (e.id ? `https://www.youtube.com/watch?v=${e.id}` : '');
      return entryToTrack({ ...e, webpage_url: url }, requesterId, requesterTag);
    });
  } catch (err) {
    log.error(err, 'YouTube search failed');
    return [];
  }
}

export async function getYouTubeStreamUrl(url: string): Promise<string> {
  const args = [
    '--no-warnings',
    '--no-playlist',
    '-f',
    'bestaudio[acodec=opus]/bestaudio/best',
    '--get-url',
    url,
  ];
  const out = await runYtdlp(args);
  const streamUrl = out.trim().split('\n')[0];
  if (!streamUrl) throw new SourceError('Could not resolve stream URL');
  return streamUrl;
}
