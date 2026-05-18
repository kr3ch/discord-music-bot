import { Client, Collection, GatewayIntentBits } from 'discord.js';
import type { Command } from './types/command';
import { MusicManager } from './music/MusicManager';

export class BotClient extends Client {
  public commands = new Collection<string, Command>();
  public music: MusicManager;
  public startedAt = Date.now();

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
      ],
    });

    this.music = new MusicManager(this);
  }
}
