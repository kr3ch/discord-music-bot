import { Events } from 'discord.js';
import type { BotEvent } from '../types/event';
import { createChildLogger } from '../utils/logger';

const log = createChildLogger('event:error');

const event: BotEvent<typeof Events.Error> = {
  name: Events.Error,
  execute(_client, error) {
    log.error(error, 'Client error');
  },
};

export default event;
