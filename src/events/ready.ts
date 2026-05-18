import { ActivityType, Events } from 'discord.js';
import type { BotEvent } from '../types/event';
import { createChildLogger } from '../utils/logger';

const log = createChildLogger('event:ready');

const event: BotEvent<typeof Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  async execute(_client, readyClient) {
    log.info({ tag: readyClient.user.tag, id: readyClient.user.id }, 'Bot is ready');
    readyClient.user.setPresence({
      status: 'online',
      activities: [{ name: '/play | music for your server', type: ActivityType.Listening }],
    });
  },
};

export default event;
