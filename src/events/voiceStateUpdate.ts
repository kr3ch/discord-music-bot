import { Events } from 'discord.js';
import type { BotEvent } from '../types/event';
import { createChildLogger } from '../utils/logger';

const log = createChildLogger('event:voice');

const event: BotEvent<typeof Events.VoiceStateUpdate> = {
  name: Events.VoiceStateUpdate,
  async execute(client, oldState, newState) {
    const guildId = (oldState.guild ?? newState.guild).id;
    const player = client.music.get(guildId);
    if (!player) return;

    const botId = client.user!.id;

    // Bot got kicked or disconnected
    if (oldState.id === botId && oldState.channelId && !newState.channelId) {
      log.info({ guildId }, 'Bot was disconnected from voice');
      client.music.destroy(guildId);
      return;
    }

    // Bot was moved to another channel — keep playing
    if (oldState.id === botId && oldState.channelId !== newState.channelId && newState.channelId) {
      log.info(
        { guildId, from: oldState.channelId, to: newState.channelId },
        'Bot moved to another voice channel',
      );
      return;
    }

    // Someone else's state change — check if bot is alone
    const channel = newState.channel ?? oldState.channel;
    if (!channel) return;

    const botMember = channel.guild.members.cache.get(botId);
    if (!botMember?.voice.channel) return;

    const humans = botMember.voice.channel.members.filter((m) => !m.user.bot);
    if (humans.size === 0) {
      player.scheduleLeave();
    } else {
      player.clearLeaveTimer();
    }
  },
};

export default event;
