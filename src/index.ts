import { BotClient } from './client';
import { generateDependencyReport } from '@discordjs/voice';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './database/prisma';
import { loadCommands } from './handlers/commandHandler';
import { loadEvents } from './handlers/eventHandler';
import { createChildLogger } from './utils/logger';

const log = createChildLogger('bootstrap');

async function main() {
  log.info('Starting Discord music bot…');
  log.info({ report: generateDependencyReport() }, 'Voice dependency report');

  await connectDatabase();

  const client = new BotClient();
  await loadCommands(client);
  await loadEvents(client);

  process.on('SIGINT', () => shutdown(client));
  process.on('SIGTERM', () => shutdown(client));
  process.on('unhandledRejection', (err) => log.error({ err }, 'Unhandled promise rejection'));
  process.on('uncaughtException', (err) => log.error({ err }, 'Uncaught exception'));

  await client.login(env.DISCORD_TOKEN);
}

async function shutdown(client: BotClient) {
  log.info('Shutting down…');
  for (const player of client.music.all()) player.destroy();
  client.destroy();
  await disconnectDatabase();
  process.exit(0);
}

main().catch((err) => {
  log.fatal(err, 'Fatal startup error');
  process.exit(1);
});
