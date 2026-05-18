import { Client, Collection, TextChannel, VoiceBasedChannel } from 'discord.js';
import { GuildPlayer } from './Player';
import { getGuildSettings } from '../utils/permissions';
import { createChildLogger } from '../utils/logger';

const log = createChildLogger('music-manager');

export class MusicManager {
  private players = new Collection<string, GuildPlayer>();

  constructor(private readonly client: Client) {}

  get(guildId: string): GuildPlayer | undefined {
    return this.players.get(guildId);
  }

  has(guildId: string): boolean {
    return this.players.has(guildId);
  }

  size(): number {
    return this.players.size;
  }

  all(): GuildPlayer[] {
    return Array.from(this.players.values());
  }

  async getOrCreate(
    guildId: string,
    voiceChannel: VoiceBasedChannel,
    textChannel: TextChannel,
  ): Promise<GuildPlayer> {
    let player = this.players.get(guildId);
    if (player) {
      player.textChannel = textChannel;
      player.clearLeaveTimer();
      await player.connect(voiceChannel);
      return player;
    }

    const settings = await getGuildSettings(guildId);
    player = new GuildPlayer(guildId, this.client);
    player.volume = settings.volume;
    player.autoplay = settings.autoplay;
    player.twentyFourSeven = settings.twentyFourSeven;
    player.textChannel = textChannel;

    await player.connect(voiceChannel);
    this.players.set(guildId, player);
    log.info({ guildId }, 'Created new player');
    return player;
  }

  destroy(guildId: string): void {
    const player = this.players.get(guildId);
    if (player) {
      player.destroy();
      this.players.delete(guildId);
      log.info({ guildId }, 'Destroyed player');
    }
  }
}
