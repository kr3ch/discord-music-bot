import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { BotClient } from '../client';
import type { BotEvent } from '../types/event';
import { createChildLogger } from '../utils/logger';

const log = createChildLogger('event-handler');

export async function loadEvents(client: BotClient): Promise<void> {
  const eventsDir = join(__dirname, '..', 'events');
  const files = readdirSync(eventsDir).filter(
    (f) => (f.endsWith('.js') || f.endsWith('.ts')) && !f.endsWith('.d.ts'),
  );

  for (const file of files) {
    try {
      const mod: { default?: BotEvent } & Partial<BotEvent> = await import(join(eventsDir, file));
      const event = (mod.default ?? (mod as unknown as BotEvent)) as BotEvent;
      if (!event?.name || !event.execute) {
        log.warn({ file }, 'Skipped invalid event');
        continue;
      }
      if (event.once) {
        client.once(event.name, (...args) => event.execute(client, ...args));
      } else {
        client.on(event.name, (...args) => event.execute(client, ...args));
      }
      log.debug({ name: event.name }, 'Loaded event');
    } catch (err) {
      log.error({ err, file }, 'Failed to load event');
    }
  }
}
