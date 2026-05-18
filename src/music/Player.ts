import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnection,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import type { Client, TextChannel, VoiceBasedChannel } from 'discord.js';
import { Queue } from './Queue';
import { createTrackStream, type StreamHandle } from './stream';
import { LoopMode, type TrackInfo } from '../types/track';
import { createChildLogger } from '../utils/logger';
import { MusicError } from '../utils/errors';
import { env } from '../config/env';
import { searchYouTube } from './sources/youtube';
import { nowPlayingEmbed } from '../utils/embeds';
import { playerControlsRow, playerSecondaryRow } from '../utils/components';
import { prisma } from '../database/prisma';

const log = createChildLogger('player');

interface VoteSkipState {
  voters: Set<string>;
  required: number;
}

export class GuildPlayer {
  public readonly queue = new Queue();
  public volume = 80;
  public autoplay = false;
  public twentyFourSeven = false;
  public textChannel: TextChannel | null = null;

  private audioPlayer: AudioPlayer;
  private connection: VoiceConnection | null = null;
  private currentResource: AudioResource | null = null;
  private currentStream: StreamHandle | null = null;
  private startedAt = 0;
  private pausedAt = 0;
  private seekOffset = 0;
  private leaveTimer: NodeJS.Timeout | null = null;
  private voteSkip: VoteSkipState | null = null;
  private destroyed = false;

  constructor(
    public readonly guildId: string,
    private readonly client: Client,
  ) {
    this.audioPlayer = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });

    this.audioPlayer.on('error', (err) => {
      log.error(
        { err, guildId: this.guildId, track: this.queue.current?.title },
        'Audio player error',
      );
      this.advance();
    });

    this.audioPlayer.on(AudioPlayerStatus.Idle, (oldState) => {
      if (
        oldState.status === AudioPlayerStatus.Playing ||
        oldState.status === AudioPlayerStatus.Buffering
      ) {
        this.advance();
      }
    });

    this.audioPlayer.on(AudioPlayerStatus.Playing, () => {
      this.startedAt = Date.now() - this.seekOffset * 1000;
    });
  }

  async connect(channel: VoiceBasedChannel): Promise<void> {
    if (this.connection && this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
      if (this.connection.joinConfig.channelId === channel.id) return;
    }

    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });

    this.connection.subscribe(this.audioPlayer);

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection!, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection!, VoiceConnectionStatus.Connecting, 5_000),
        ]);
        // Voice is reconnecting on its own — nothing to do.
      } catch {
        log.warn({ guildId: this.guildId }, 'Voice disconnected unrecoverably');
        this.destroy();
      }
    });

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);
    } catch (err) {
      this.connection.destroy();
      this.connection = null;
      throw new MusicError(`Could not join voice channel: ${(err as Error).message}`);
    }
  }

  enqueue(...tracks: TrackInfo[]): void {
    this.queue.push(...tracks);
    if (this.audioPlayer.state.status === AudioPlayerStatus.Idle) {
      this.advance();
    }
  }

  private async playTrack(track: TrackInfo, seekSeconds = 0): Promise<void> {
    this.cleanupCurrent();
    this.seekOffset = seekSeconds;

    let attempt = 0;
    while (attempt < 3) {
      try {
        const handle = createTrackStream(track, seekSeconds);
        this.currentStream = handle;
        this.currentResource = createAudioResource(handle.stream, {
          inputType: StreamType.Raw,
          inlineVolume: true,
        });
        this.currentResource.volume?.setVolume(this.volume / 100);
        this.audioPlayer.play(this.currentResource);
        this.voteSkip = null;
        return;
      } catch (err) {
        attempt++;
        log.warn({ err, attempt, track: track.title }, 'Failed to start track, retrying');
        if (attempt >= 3) {
          this.notifyText(`❌ Failed to play **${track.title}** after 3 attempts. Skipping.`);
          this.advance();
          return;
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  private cleanupCurrent(): void {
    if (this.currentStream) {
      try {
        this.currentStream.cleanup();
      } catch {
        /* noop */
      }
      this.currentStream = null;
    }
    this.currentResource = null;
  }

  private advance(): void {
    if (this.destroyed) return;

    const track = this.queue.next();
    if (!track) {
      this.cleanupCurrent();
      void this.maybeAutoplay();
      return;
    }

    void this.playTrack(track).then(() => this.maybeAnnounce(track));
    void this.recordHistory(track);
  }

  private async maybeAutoplay(): Promise<void> {
    if (this.queue.current && this.autoplay) {
      try {
        const seed = this.queue.current;
        const results = await searchYouTube(
          `${seed.title} ${seed.author}`,
          this.client.user!.id,
          'autoplay',
          5,
        );
        const next = results.find((r) => r.url !== seed.url);
        if (next) {
          this.queue.push(next);
          this.advance();
          return;
        }
      } catch (err) {
        log.warn({ err }, 'Autoplay search failed');
      }
    }

    if (!this.twentyFourSeven) {
      this.scheduleLeave();
    }
  }

  private async recordHistory(track: TrackInfo): Promise<void> {
    if (track.requestedBy === this.client.user?.id) return;
    try {
      await prisma.playHistory.create({
        data: {
          userId: track.requestedBy,
          guildId: this.guildId,
          title: track.title,
          url: track.url,
          duration: track.duration,
        },
      });
      await prisma.userStats.upsert({
        where: { userId: track.requestedBy },
        create: { userId: track.requestedBy, tracksPlayed: 1, totalDuration: track.duration },
        update: { tracksPlayed: { increment: 1 }, totalDuration: { increment: track.duration } },
      });
    } catch (err) {
      log.warn({ err }, 'Failed to record history');
    }
  }

  private async maybeAnnounce(track: TrackInfo): Promise<void> {
    if (!this.textChannel) return;
    try {
      const embed = nowPlayingEmbed(track, 0, this.volume);
      await this.textChannel.send({
        embeds: [embed],
        components: [playerControlsRow(false), playerSecondaryRow()],
      });
    } catch (err) {
      log.debug({ err }, 'Failed to announce now playing');
    }
  }

  private notifyText(text: string): void {
    if (!this.textChannel) return;
    this.textChannel.send(text).catch(() => undefined);
  }

  pause(): boolean {
    if (this.audioPlayer.state.status === AudioPlayerStatus.Playing) {
      this.audioPlayer.pause(true);
      this.pausedAt = Date.now();
      return true;
    }
    return false;
  }

  resume(): boolean {
    if (this.audioPlayer.state.status === AudioPlayerStatus.Paused) {
      this.audioPlayer.unpause();
      if (this.pausedAt > 0) {
        this.startedAt += Date.now() - this.pausedAt;
        this.pausedAt = 0;
      }
      return true;
    }
    return false;
  }

  skip(): TrackInfo | null {
    const skipped = this.queue.current;
    if (this.queue.loopMode === LoopMode.Track) {
      // Don't loop the skipped track
      this.queue.loopMode = LoopMode.Off;
    }
    this.audioPlayer.stop(true);
    return skipped;
  }

  stop(): void {
    this.queue.clear();
    this.queue.setCurrent(null);
    this.queue.setLoop(LoopMode.Off);
    this.audioPlayer.stop(true);
    this.cleanupCurrent();
    if (!this.twentyFourSeven) this.scheduleLeave();
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(200, volume));
    this.currentResource?.volume?.setVolume(this.volume / 100);
  }

  async seek(seconds: number): Promise<void> {
    if (!this.queue.current) throw new MusicError('Nothing is playing');
    if (this.queue.current.isLive) throw new MusicError('Cannot seek a livestream');
    if (seconds < 0 || seconds >= this.queue.current.duration) {
      throw new MusicError('Seek time is out of bounds');
    }
    await this.playTrack(this.queue.current, seconds);
  }

  getPosition(): number {
    if (!this.startedAt || !this.queue.current) return 0;
    if (this.audioPlayer.state.status === AudioPlayerStatus.Paused && this.pausedAt > 0) {
      return Math.floor((this.pausedAt - this.startedAt) / 1000);
    }
    return Math.floor((Date.now() - this.startedAt) / 1000);
  }

  isPaused(): boolean {
    return this.audioPlayer.state.status === AudioPlayerStatus.Paused;
  }

  isPlaying(): boolean {
    return this.audioPlayer.state.status === AudioPlayerStatus.Playing;
  }

  isIdle(): boolean {
    return this.audioPlayer.state.status === AudioPlayerStatus.Idle;
  }

  voteSkipRequest(
    userId: string,
    required: number,
  ): { count: number; required: number; passed: boolean } {
    if (!this.voteSkip) this.voteSkip = { voters: new Set(), required };
    this.voteSkip.voters.add(userId);
    this.voteSkip.required = required;
    const passed = this.voteSkip.voters.size >= required;
    if (passed) this.skip();
    return { count: this.voteSkip.voters.size, required, passed };
  }

  scheduleLeave(): void {
    this.clearLeaveTimer();
    const timeout = env.LEAVE_ON_EMPTY_TIMEOUT * 1000;
    if (timeout <= 0) return;
    this.leaveTimer = setTimeout(() => {
      if (!this.twentyFourSeven && this.queue.length === 0 && this.isIdle()) {
        this.destroy();
      }
    }, timeout);
  }

  clearLeaveTimer(): void {
    if (this.leaveTimer) {
      clearTimeout(this.leaveTimer);
      this.leaveTimer = null;
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.cleanupCurrent();
    this.clearLeaveTimer();
    this.audioPlayer.stop(true);
    try {
      this.connection?.destroy();
    } catch {
      /* noop */
    }
    this.connection = null;
  }
}
