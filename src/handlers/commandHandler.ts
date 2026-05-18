import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { BotClient } from '../client';
import type { Command } from '../types/command';
import { createChildLogger } from '../utils/logger';

const log = createChildLogger('command-handler');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (full.endsWith('.js') || full.endsWith('.ts')) {
      if (full.endsWith('.d.ts')) continue;
      out.push(full);
    }
  }
  return out;
}

export async function loadCommands(client: BotClient): Promise<Command[]> {
  const commandsDir = join(__dirname, '..', 'commands');
  const files = walk(commandsDir);
  const list: Command[] = [];

  for (const file of files) {
    try {
      const mod: { default?: Command } & Partial<Command> = await import(file);
      const command = (mod.default ?? (mod as unknown as Command)) as Command;
      if (!command?.data || !command.execute) {
        log.warn({ file }, 'Skipped invalid command');
        continue;
      }
      client.commands.set(command.data.name, command);
      list.push(command);
      log.debug({ name: command.data.name }, 'Loaded command');
    } catch (err) {
      log.error({ err, file }, 'Failed to load command');
    }
  }

  log.info({ count: list.length }, 'Commands loaded');
  return list;
}
