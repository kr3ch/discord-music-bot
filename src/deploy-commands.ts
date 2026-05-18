import { REST, Routes } from 'discord.js';
import { env } from './config/env';
import { BotClient } from './client';
import { loadCommands } from './handlers/commandHandler';
import { createChildLogger } from './utils/logger';

const log = createChildLogger('deploy');

async function main() {
  const client = new BotClient();
  const commands = await loadCommands(client);
  const body = commands.map((c) => c.data.toJSON());

  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

  if (env.DEV_GUILD_ID) {
    log.info({ guildId: env.DEV_GUILD_ID }, 'Registering guild commands');
    await rest.put(Routes.applicationGuildCommands(env.CLIENT_ID, env.DEV_GUILD_ID), { body });
    log.info({ count: body.length }, 'Guild commands registered (instant)');
  } else {
    log.info('Registering global commands (takes up to 1 hour to propagate)');
    await rest.put(Routes.applicationCommands(env.CLIENT_ID), { body });
    log.info({ count: body.length }, 'Global commands registered');
  }
}

main().catch((err) => {
  log.fatal(err, 'deploy-commands failed');
  process.exit(1);
});
