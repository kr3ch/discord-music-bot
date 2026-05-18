import { spawn, ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import ffmpegStatic from 'ffmpeg-static';
import { env } from '../config/env';
import { createChildLogger } from '../utils/logger';
import { MusicError } from '../utils/errors';
import type { TrackInfo } from '../types/track';

const log = createChildLogger('stream');

function findBinary(envPath: string, name: string, fallback?: string | null): string {
  if (envPath) return envPath;
  const portable = join(process.cwd(), 'bin', `${name}.exe`);
  if (existsSync(portable)) return portable;
  return fallback || name;
}

const FFMPEG = findBinary(env.FFMPEG_PATH, 'ffmpeg', ffmpegStatic);
const YTDLP = findBinary(env.YTDLP_PATH, 'yt-dlp');

export interface StreamHandle {
  stream: Readable;
  cleanup: () => void;
}

/**
 * Create a PCM stream for a track using yt-dlp + ffmpeg piped together.
 *
 *   yt-dlp -o - <url>   →   ffmpeg -i pipe:0 -f s16le -ar 48000 -ac 2 pipe:1
 *
 * @discordjs/voice's createAudioResource handles opus encoding from raw PCM,
 * giving us a stable pipeline with per-track volume control.
 */
export function createTrackStream(track: TrackInfo, seekSeconds = 0): StreamHandle {
  log.debug({ url: track.url, source: track.source, seek: seekSeconds }, 'Creating track stream');

  let ytdlp: ChildProcess | null = null;
  const ffmpegInputArgs: string[] = [
    '-loglevel',
    'error',
    '-reconnect',
    '1',
    '-reconnect_streamed',
    '1',
    '-reconnect_delay_max',
    '5',
  ];

  if (track.source === 'http') {
    if (seekSeconds > 0) ffmpegInputArgs.push('-ss', String(seekSeconds));
    ffmpegInputArgs.push('-i', track.url);
  } else {
    const ytdlpArgs = [
      '--no-warnings',
      '--no-playlist',
      '-f',
      'bestaudio[acodec=opus]/bestaudio/best',
      '-o',
      '-',
      track.url,
    ];
    ytdlp = spawn(YTDLP, ytdlpArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    ytdlp.stderr?.on('data', (d: Buffer) => log.trace({ source: 'yt-dlp' }, d.toString().trim()));
    ytdlp.on('error', (err) => log.error(err, 'yt-dlp process error'));

    if (seekSeconds > 0) ffmpegInputArgs.push('-ss', String(seekSeconds));
    ffmpegInputArgs.push('-i', 'pipe:0');
  }

  const ffmpegArgs = [
    ...ffmpegInputArgs,
    '-analyzeduration',
    '0',
    '-vn',
    '-f',
    's16le',
    '-ar',
    '48000',
    '-ac',
    '2',
    'pipe:1',
  ];

  const ffmpeg: ChildProcess = spawn(FFMPEG, ffmpegArgs, {
    stdio: [ytdlp ? 'pipe' : 'ignore', 'pipe', 'pipe'],
  });

  ffmpeg.stderr?.on('data', (d: Buffer) => log.trace({ source: 'ffmpeg' }, d.toString().trim()));
  ffmpeg.on('error', (err) => log.error(err, 'ffmpeg process error'));

  if (ytdlp && ffmpeg.stdin && ytdlp.stdout) {
    ytdlp.stdout.pipe(ffmpeg.stdin).on('error', (err: Error) => {
      log.debug({ err: err.message }, 'yt-dlp→ffmpeg pipe ended');
    });
    ytdlp.stdout.on('error', (err) => log.debug({ err: err.message }, 'yt-dlp stdout error'));
  }

  const cleanup = () => {
    try {
      ytdlp?.kill('SIGKILL');
    } catch {
      /* noop */
    }
    try {
      ffmpeg.kill('SIGKILL');
    } catch {
      /* noop */
    }
  };

  ffmpeg.on('close', () => {
    if (ytdlp && !ytdlp.killed) ytdlp.kill('SIGKILL');
  });

  const out = ffmpeg.stdout;
  if (!out) {
    cleanup();
    throw new MusicError('Failed to start audio stream');
  }

  return { stream: out, cleanup };
}
